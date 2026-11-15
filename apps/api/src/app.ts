import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import Stripe from 'stripe';
import swaggerUi from 'swagger-ui-express';
import {
  configSchema,
  bookingSchema,
  estimateSchema,
  estimateLocal,
  cartSchema,
  cartTotal,
  products,
  faq,
} from '@apex/types';
import { slotDate, localSlot, validFutureSlot } from './domain';
import { openapi } from './openapi';
const db = new PrismaClient();
const secret = process.env.JWT_SECRET || randomBytes(48).toString('hex');
const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:4200').split(
  ',',
);
const py = process.env.PYTHON_URL || 'http://localhost:8001';
const serviceToken = process.env.SERVICE_TOKEN || 'local-demo-service-token';
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey?.startsWith('sk_test_') ? new Stripe(stripeKey) : null;
const webUrl = process.env.WEB_URL || 'http://localhost:3000';
declare global {
  namespace Express {
    interface Request {
      auth?: { id: string; role: string };
    }
  }
}
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || origins.includes(origin)),
    credentials: true,
  }),
);
app.use(
  rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false }),
);
const authLimit = rateLimit({
  windowMs: 900000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json', limit: '256kb' }),
  async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      res.status(503).json({ error: 'Stripe test webhook not configured' });
      return;
    }
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.get('stripe-signature') || '',
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }
    if (event.livemode) {
      res.status(400).json({ error: 'Only test events are supported' });
      return;
    }
    await db.$transaction(async (tx) => {
      const exists = await tx.webhookEvent.findUnique({ where: { id: event.id } });
      if (exists) return;
      await tx.webhookEvent.create({ data: { id: event.id } });
      if (
        event.type === 'checkout.session.completed' ||
        event.type === 'checkout.session.async_payment_succeeded'
      ) {
        const session = event.data.object;
        if (session.payment_status === 'paid')
          await tx.order.updateMany({
            where: { stripeId: session.id, amount: session.amount_total ?? -1, status: 'pending' },
            data: { status: 'paid' },
          });
      }
    });
    res.json({ received: true });
  },
);
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());
function reject(res: Response, status: number, error: string) {
  res.status(status).json({ error });
}
function originCheck(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');
  if (origin && !origins.includes(origin)) {
    reject(res, 403, 'Origin rejected');
    return;
  }
  next();
}
async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.get('authorization')?.replace(/^Bearer /, '');
    if (!token) throw new Error();
    const data = z.object({ sub: z.string() }).parse(
      jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: 'apex-api',
        audience: 'apex-client',
      }),
    );
    const user = await db.user.findUnique({ where: { id: data.sub } });
    if (!user) throw new Error();
    req.auth = { id: user.id, role: user.role };
    next();
  } catch {
    reject(res, 401, 'Sign in required');
  }
}
function staff(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || !['admin', 'manager'].includes(req.auth.role)) {
    reject(res, 403, 'Staff access required');
    return;
  }
  next();
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const cookie = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax' as const,
  path: '/auth',
  maxAge: 7 * 86400000,
};
async function createSession(
  user: { id: string; role: string },
  tx: Prisma.TransactionClient = db,
) {
  const refresh = randomBytes(48).toString('hex');
  await tx.session.create({
    data: {
      userId: user.id,
      tokenHash: hash(refresh),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return {
    refresh,
    accessToken: jwt.sign({ role: user.role }, secret, {
      subject: user.id,
      expiresIn: '15m',
      algorithm: 'HS256',
      issuer: 'apex-api',
      audience: 'apex-client',
    }),
  };
}
function publicUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
app.get('/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ ok: true, mode: 'live', stripeTest: Boolean(stripe) });
});
app.post('/auth/register', authLimit, originCheck, async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2).max(100),
      email: z
        .email()
        .max(254)
        .transform((s) => s.toLowerCase()),
      password: z.string().min(12).max(100),
    })
    .parse(req.body);
  const user = await db.user.create({
    data: { name: data.name, email: data.email, password: await bcrypt.hash(data.password, 12) },
  });
  const session = await createSession(user);
  res
    .cookie('refresh', session.refresh, cookie)
    .status(201)
    .json({ accessToken: session.accessToken, user: publicUser(user) });
});
app.post('/auth/login', authLimit, originCheck, async (req, res) => {
  const data = z
    .object({
      email: z.email().transform((s) => s.toLowerCase()),
      password: z.string().min(1).max(100),
    })
    .parse(req.body);
  const user = await db.user.findUnique({ where: { email: data.email } });
  const passwordHash =
    user?.password ||
    '$2b$12$........................................................................';
  const valid = await bcrypt.compare(data.password, passwordHash);
  if (!user || !valid) {
    reject(res, 401, 'Invalid credentials');
    return;
  }
  const session = await createSession(user);
  res
    .cookie('refresh', session.refresh, cookie)
    .json({ accessToken: session.accessToken, user: publicUser(user) });
});
app.post('/auth/refresh', authLimit, originCheck, async (req, res) => {
  const token = z.string().min(80).max(120).safeParse(req.cookies.refresh);
  if (!token.success) {
    reject(res, 401, 'Session expired');
    return;
  }
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token.data) },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    reject(res, 401, 'Session expired');
    return;
  }
  const next = await db.$transaction(async (tx) => {
    const removed = await tx.session.deleteMany({
      where: { id: session.id, expiresAt: { gt: new Date() } },
    });
    if (removed.count !== 1) return null;
    return createSession(session.user, tx);
  });
  if (!next) {
    reject(res, 401, 'Session already rotated');
    return;
  }
  res
    .cookie('refresh', next.refresh, cookie)
    .json({ accessToken: next.accessToken, user: publicUser(session.user) });
});
app.post('/auth/logout', originCheck, async (req, res) => {
  const token = z.string().safeParse(req.cookies.refresh);
  if (token.success) await db.session.deleteMany({ where: { tokenHash: hash(token.data) } });
  res.clearCookie('refresh', { ...cookie, maxAge: undefined }).json({ ok: true });
});
app.get('/auth/me', auth, async (req, res) => {
  const user = await db.user.findUniqueOrThrow({ where: { id: req.auth!.id } });
  res.json(publicUser(user));
});
app.post('/estimate', async (req, res) => {
  const input = estimateSchema.parse(req.body);
  try {
    const response = await fetch(`${py}/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) throw new Error();
    const parsed = z
      .object({
        amount: z.number().int().nonnegative(),
        currency: z.literal('PLN'),
        version: z.string(),
      })
      .parse(await response.json());
    res.json({ ...parsed, source: 'python' });
  } catch {
    res.json(estimateLocal(input));
  }
});
app.get('/slots', async (req, res) => {
  const { date } = z.object({ date: z.iso.date() }).parse(req.query);
  const times = ['10:00', '12:00', '14:00'];
  const rows = await db.booking.findMany({
    where: {
      slot: { gte: slotDate(date, '00:00'), lte: slotDate(date, '23:59') },
      status: { not: 'cancelled' },
    },
    select: { slot: true },
  });
  const used = new Set(rows.map((row) => localSlot(row.slot).time));
  res.json(times.filter((time) => !used.has(time) && validFutureSlot(date, time)));
});
const serialize = (row: Awaited<ReturnType<typeof db.booking.findFirstOrThrow>>) => ({
  ...row,
  ...localSlot(row.slot),
  config: row.config,
  mode: 'live',
  createdAt: row.createdAt.toISOString(),
});
app.post('/bookings', auth, async (req, res) => {
  const data = bookingSchema.parse(req.body);
  const key = z.string().uuid().parse(req.get('idempotency-key'));
  const idempotency = `${req.auth!.id}:${key}`;
  const existing = await db.booking.findUnique({ where: { idempotency } });
  if (existing) {
    if (
      existing.service !== data.service ||
      existing.size !== data.size ||
      existing.extra !== data.extra ||
      existing.slot.getTime() !== slotDate(data.date, data.time).getTime() ||
      JSON.stringify(configSchema.parse(existing.config)) !== JSON.stringify(data.config)
    ) {
      reject(res, 409, 'Idempotency key reused with different data');
      return;
    }
    res.json(serialize(existing));
    return;
  }
  if (!validFutureSlot(data.date, data.time)) {
    reject(res, 400, 'Choose a valid future slot within 90 days');
    return;
  }
  const user = await db.user.findUniqueOrThrow({ where: { id: req.auth!.id } });
  const row = await db.booking.create({
    data: {
      userId: user.id,
      name: data.name,
      email: user.email,
      service: data.service,
      size: data.size,
      extra: data.extra,
      slot: slotDate(data.date, data.time),
      config: data.config,
      amount: estimateLocal(data).amount,
      idempotency,
    },
  });
  res.status(201).json(serialize(row));
});
app.get('/bookings', auth, async (req, res) => {
  res.json(
    (
      await db.booking.findMany({ where: { userId: req.auth!.id }, orderBy: { createdAt: 'desc' } })
    ).map(serialize),
  );
});
app.get('/bookings/:id/pdf', auth, async (req, res) => {
  const row = await db.booking.findFirst({
    where: {
      id: String(req.params.id),
      ...(req.auth!.role === 'customer' ? { userId: req.auth!.id } : {}),
    },
  });
  if (!row) {
    reject(res, 404, 'Booking not found');
    return;
  }
  const response = await fetch(`${py}/estimate/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Service-Token': serviceToken },
    body: JSON.stringify({
      id: row.id,
      name: row.name,
      service: row.service,
      size: row.size,
      extra: row.extra,
      date: localSlot(row.slot).date,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    reject(res, 503, 'Document service unavailable');
    return;
  }
  res
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="apex-${row.id}.pdf"`,
    })
    .send(Buffer.from(await response.arrayBuffer()));
});
app.get('/products', (_req, res) => res.json(products));
app.post('/checkout', auth, async (req, res) => {
  const { items } = z.object({ items: cartSchema.min(1) }).parse(req.body);
  if (!stripe) {
    reject(
      res,
      503,
      'Stripe test keys are not configured; use the explicit frontend demo checkout',
    );
    return;
  }
  const order = await db.order.create({
    data: { userId: req.auth!.id, items, amount: cartTotal(items) },
  });
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: `${webUrl}/pl/account/?order=${order.id}`,
        cancel_url: `${webUrl}/pl/shop/?cancelled=1`,
        metadata: { orderId: order.id },
        line_items: items.map((item) => {
          const product = products.find((p) => p.id === item.id)!;
          return {
            quantity: item.quantity,
            price_data: {
              currency: 'pln',
              unit_amount: product.price,
              product_data: { name: product.name.en },
            },
          };
        }),
      },
      { idempotencyKey: order.id },
    );
    await db.order.update({ where: { id: order.id }, data: { stripeId: session.id } });
    res.json({ url: session.url, orderId: order.id });
  } catch (error) {
    await db.order.update({ where: { id: order.id }, data: { status: 'failed' } });
    throw error;
  }
});
app.get('/orders', auth, async (req, res) =>
  res.json(
    await db.order.findMany({ where: { userId: req.auth!.id }, orderBy: { createdAt: 'desc' } }),
  ),
);
app.get('/admin/bookings', auth, staff, async (_req, res) =>
  res.json((await db.booking.findMany({ orderBy: { slot: 'asc' }, take: 500 })).map(serialize)),
);
app.patch('/admin/bookings/:id', auth, staff, async (req, res) => {
  const data = z
    .object({
      status: z.enum(['confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
      date: z.iso.date().optional(),
      time: z.enum(['10:00', '12:00', '14:00']).optional(),
    })
    .refine((d) => Boolean(d.status) || (Boolean(d.date) && Boolean(d.time)))
    .parse(req.body);
  if (data.date && data.time && !validFutureSlot(data.date, data.time)) {
    reject(res, 400, 'Invalid target slot');
    return;
  }
  const row = await db.booking.update({
    where: { id: String(req.params.id) },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.date && data.time ? { slot: slotDate(data.date, data.time) } : {}),
    },
  });
  res.json(serialize(row));
});
app.get('/admin/clients', auth, staff, async (req, res) => {
  const q = z
    .object({
      search: z.string().max(100).default(''),
      page: z.coerce.number().int().min(1).default(1),
      sort: z.enum(['name', 'email', 'createdAt']).default('name'),
      direction: z.enum(['asc', 'desc']).default('asc'),
    })
    .parse(req.query);
  const where = {
    role: 'customer',
    OR: [
      { name: { contains: q.search, mode: 'insensitive' as const } },
      { email: { contains: q.search, mode: 'insensitive' as const } },
    ],
  };
  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { [q.sort]: q.direction },
      skip: (q.page - 1) * 10,
      take: 10,
    }),
    db.user.count({ where }),
  ]);
  res.json({ rows, total, page: q.page });
});
app.patch('/admin/users/:id/role', auth, staff, async (req, res) => {
  if (req.auth!.role !== 'admin') {
    reject(res, 403, 'Admin access required');
    return;
  }
  const { role } = z.object({ role: z.enum(['customer', 'manager']) }).parse(req.body);
  if (String(req.params.id) === req.auth!.id) {
    reject(res, 400, 'Cannot modify your own role');
    return;
  }
  const result = await db.user.update({ where: { id: String(req.params.id) }, data: { role } });
  res.json(publicUser(result));
});
async function report() {
  return db.$queryRaw<
    Array<{ month: string; revenue: number; bookings: number; running: number }>
  >`WITH monthly AS (SELECT to_char(b."slot",'YYYY-MM') AS month, SUM(CASE WHEN b.status='completed' THEN b.amount ELSE 0 END)::int AS revenue, COUNT(*)::int AS bookings FROM "Booking" b JOIN "User" u ON u.id=b."userId" WHERE b.status<>'cancelled' GROUP BY 1) SELECT month,revenue,bookings,(SUM(revenue) OVER (ORDER BY month))::int AS running FROM monthly ORDER BY month`;
}
app.get('/admin/reports', auth, staff, async (_req, res) => res.json(await report()));
app.get('/admin/export', auth, staff, async (_req, res) => {
  const rows = await report();
  const response = await fetch(`${py}/reports/excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Service-Token': serviceToken },
    body: JSON.stringify({ rows }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    reject(res, 503, 'Export service unavailable');
    return;
  }
  res
    .set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="apex-report.xlsx"',
    })
    .send(Buffer.from(await response.arrayBuffer()));
});
app.post('/faq', (req, res) => {
  const { message, locale } = z
    .object({ message: z.string().max(1000), locale: z.enum(['pl', 'en', 'ua']).default('pl') })
    .parse(req.body);
  const match = faq.find((item) => item.keys.some((key) => message.toLowerCase().includes(key)));
  res.json({
    reply:
      match?.[locale] ??
      {
        pl: 'Wybierz usługę w formularzu rezerwacji. To projekt demonstracyjny.',
        en: 'Choose a service in the booking form. This is a demo project.',
        ua: 'Вибери послугу у формі бронювання. Це демонстраційний проєкт.',
      }[locale],
    source: 'rules',
  });
});
app.get('/openapi.json', (_req, res) => res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      issues: error.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    reject(res, 409, 'Slot or unique value already exists');
    return;
  }
  if (error instanceof SyntaxError) {
    reject(res, 400, 'Invalid JSON');
    return;
  }
  console.error(error instanceof Error ? error.message : 'Request failed');
  reject(res, 500, 'Request failed');
});
