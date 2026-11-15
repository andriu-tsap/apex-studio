import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { defaultConfig } from '@apex/types';
import { randomUUID } from 'node:crypto';
import { app } from './app';
const db = new PrismaClient();
const ids: string[] = [];
let access = '';
let admin = '';
let other = '';
let bookingId = '';
let cookie = '';
const key = randomUUID();
const future = new Date();
future.setDate(future.getDate() + 42);
const date = future.toISOString().slice(0, 10);
const input = {
  name: 'Integration demo',
  email: 'integration@example.invalid',
  service: 'detail',
  size: 'coupe',
  extra: false,
  date,
  time: '14:00',
  config: defaultConfig,
  consent: true,
};
describe.runIf(Boolean(process.env.DATABASE_URL))('API with migrated PostgreSQL', () => {
  beforeAll(async () => {
    for (let i = 0; i < 3; i++) {
      const result = await request(app)
        .post('/auth/register')
        .send({
          name: 'Integration demo',
          email: `test-${randomUUID()}@example.invalid`,
          password: 'IntegrationDemo2026!',
        });
      expect(result.status).toBe(201);
      ids.push(result.body.user.id);
      if (i === 0) {
        access = result.body.accessToken;
        cookie = String(result.headers['set-cookie'][0]).split(';')[0];
      } else if (i === 1) other = result.body.accessToken;
      else {
        admin = result.body.accessToken;
        await db.user.update({ where: { id: result.body.user.id }, data: { role: 'admin' } });
      }
    }
  });
  afterAll(async () => {
    await db.session.deleteMany({ where: { userId: { in: ids } } });
    await db.booking.deleteMany({ where: { userId: { in: ids } } });
    await db.order.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  });
  it('protects staff endpoints and prevents cross-origin session mutation', async () => {
    expect((await request(app).get('/admin/reports')).status).toBe(401);
    expect((await request(app).get('/admin/reports').auth(access, { type: 'bearer' })).status).toBe(
      403,
    );
    expect(
      (await request(app).post('/auth/logout').set('Origin', 'https://untrusted.example')).status,
    ).toBe(403);
  });
  it('rotates a refresh token exactly once', async () => {
    const first = await request(app).post('/auth/refresh').set('Cookie', cookie);
    expect(first.status).toBe(200);
    const replay = await request(app).post('/auth/refresh').set('Cookie', cookie);
    expect(replay.status).toBe(401);
  });
  it('keeps booking creation idempotent and rejects competing reservations', async () => {
    const first = await request(app)
      .post('/bookings')
      .auth(access, { type: 'bearer' })
      .set('Idempotency-Key', key)
      .send(input);
    expect(first.status).toBe(201);
    bookingId = first.body.id;
    const replay = await request(app)
      .post('/bookings')
      .auth(access, { type: 'bearer' })
      .set('Idempotency-Key', key)
      .send(input);
    expect(replay.status).toBe(200);
    expect(replay.body.id).toBe(bookingId);
    const conflict = await request(app)
      .post('/bookings')
      .auth(other, { type: 'bearer' })
      .set('Idempotency-Key', randomUUID())
      .send(input);
    expect(conflict.status).toBe(409);
  });
  it('does not expose another customer PDF', async () => {
    expect(
      (await request(app).get(`/bookings/${bookingId}/pdf`).auth(other, { type: 'bearer' })).status,
    ).toBe(404);
  });
  it('runs the SQL report with numeric aggregates', async () => {
    const result = await request(app).get('/admin/reports').auth(admin, { type: 'bearer' });
    expect(result.status).toBe(200);
    expect(Array.isArray(result.body)).toBe(true);
    expect(
      result.body.every(
        (row: { revenue: unknown; running: unknown }) =>
          typeof row.revenue === 'number' && typeof row.running === 'number',
      ),
    ).toBe(true);
  });
  it('rejects unknown products and live checkout without test configuration', async () => {
    const bad = await request(app)
      .post('/checkout')
      .auth(access, { type: 'bearer' })
      .send({ items: [{ id: 'attacker-price', quantity: 1 }] });
    expect(bad.status).toBe(400);
    if (!process.env.STRIPE_SECRET_KEY)
      expect(
        (
          await request(app)
            .post('/checkout')
            .auth(access, { type: 'bearer' })
            .send({ items: [{ id: 'wash', quantity: 1 }] })
        ).status,
      ).toBe(503);
  });
  it('produces the same Python estimate as the shared local formula', async () => {
    const result = await request(app)
      .post('/estimate')
      .send({ service: 'ceramic', size: 'suv', extra: true });
    expect(result.status).toBe(200);
    expect(result.body.amount).toBe(254000);
  });
});
