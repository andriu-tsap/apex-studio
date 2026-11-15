import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { defaultConfig } from '@apex/types';
import { slotDate } from '../src/domain';
const db = new PrismaClient();
try {
  for (const [email, name, role] of [
    ['admin@apex.demo', 'Demo admin', 'admin'],
    ['manager@apex.demo', 'Demo manager', 'manager'],
    ['client@apex.demo', 'Demo client', 'customer'],
  ]) {
    await db.user.upsert({
      where: { email },
      create: { email, name, role, password: await bcrypt.hash('ApexDemo2026!', 12) },
      update: {},
    });
  }
  const user = await db.user.findUniqueOrThrow({ where: { email: 'client@apex.demo' } });
  for (let i = 1; i <= 12; i++) {
    const day = new Date();
    day.setDate(day.getDate() + i);
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(day);
    const slot = slotDate(date, '10:00');
    await db.booking.upsert({
      where: { idempotency: `seed-${i}` },
      create: {
        userId: user.id,
        name: 'Demo client',
        email: user.email,
        service: i % 2 ? 'detail' : 'ceramic',
        size: 'coupe',
        extra: false,
        slot,
        config: defaultConfig,
        amount: i % 2 ? 65000 : 180000,
        status: i < 4 ? 'completed' : 'confirmed',
        idempotency: `seed-${i}`,
      },
      update: {},
    });
  }
} finally {
  await db.$disconnect();
}
