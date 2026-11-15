'use client';
import { openDB, type DBSchema } from 'idb';
import {
  bookingSchema,
  cartSchema,
  configSchema,
  defaultConfig,
  estimateLocal,
  faq,
  type Booking,
  type BookingInput,
  type Cart,
  type CarConfiguration,
} from '@apex/types';
export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export type User = { id: string; name: string; email: string; role: string };
let token = '';
let user: User | null = null;
let refreshing: Promise<User | null> | null = null;
export async function restoreSession() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const response = await fetch(API + '/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { accessToken: string; user: User };
      token = data.accessToken;
      user = data.user;
      return user;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}
export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(API + path, {
    ...options,
    credentials: 'include',
    signal: options.signal ?? AbortSignal.timeout(6000),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && retry && (await restoreSession()))
    return api<T>(path, options, false);
  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: 'Request failed' }))) as {
      error?: string;
    };
    throw new ApiError(error.error || 'Request failed', response.status);
  }
  return response.json() as Promise<T>;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function authenticate(
  input: { email: string; password: string; name?: string },
  register = false,
) {
  const result = await api<{ accessToken: string; user: User }>(
    register ? '/auth/register' : '/auth/login',
    { method: 'POST', body: JSON.stringify(input) },
    false,
  );
  token = result.accessToken;
  user = result.user;
  return user;
}
export async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' }, false);
  } finally {
    token = '';
    user = null;
  }
}
export const currentUser = () => user;
export async function backendAvailable() {
  try {
    const data = await api<{ ok: boolean }>(
      '/health',
      { signal: AbortSignal.timeout(1800) },
      false,
    );
    return data.ok === true;
  } catch {
    return false;
  }
}
export function readConfig(): CarConfiguration {
  try {
    const data = configSchema.safeParse(JSON.parse(localStorage.getItem('apex-config') || 'null'));
    return data.success ? data.data : defaultConfig;
  } catch {
    return defaultConfig;
  }
}
export function saveConfig(config: CarConfiguration) {
  try {
    localStorage.setItem('apex-config', JSON.stringify(config));
  } catch {
    /* Selection still works in memory. */
  }
}
export function readCart(): Cart {
  try {
    const result = cartSchema.safeParse(JSON.parse(localStorage.getItem('apex-cart') || '[]'));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
export function saveCart(cart: Cart) {
  localStorage.setItem('apex-cart', JSON.stringify(cartSchema.parse(cart)));
}
type QueueItem = { id: string; input: BookingInput; mode: 'demo' | 'live'; ownerId?: string };
interface ApexDB extends DBSchema {
  bookings: { key: string; value: Booking & { ownerId?: string } };
  queue: { key: string; value: QueueItem };
}
const db = () =>
  openDB<ApexDB>('apex-studio', 1, {
    upgrade(database) {
      database.createObjectStore('bookings', { keyPath: 'id' });
      database.createObjectStore('queue', { keyPath: 'id' });
    },
  });
export async function localBookings() {
  return (await db()).getAll('bookings');
}
export async function submitBooking(
  input: BookingInput,
  mode: 'demo' | 'live',
  id = crypto.randomUUID(),
): Promise<Booking> {
  const data = bookingSchema.parse(input);
  const database = await db();
  if (mode === 'live' && !user) throw new Error('Sign in to submit a server booking');
  if (!navigator.onLine) {
    const booking: Booking & { ownerId?: string } = {
      ...data,
      id,
      amount: estimateLocal(data).amount,
      status: 'queued',
      mode,
      createdAt: new Date().toISOString(),
      ownerId: user?.id,
    };
    const tx = database.transaction(['bookings', 'queue'], 'readwrite');
    await tx.objectStore('bookings').put(booking);
    await tx.objectStore('queue').put({ id, input: data, mode, ownerId: user?.id });
    await tx.done;
    return booking;
  }
  if (mode === 'live') {
    const result = await api<Booking>('/bookings', {
      method: 'POST',
      headers: { 'Idempotency-Key': id },
      body: JSON.stringify(data),
    });
    return result;
  }
  const existing = await database.getAll('bookings');
  if (
    existing.some(
      (b) =>
        b.mode === 'demo' &&
        b.date === data.date &&
        b.time === data.time &&
        !['cancelled', 'conflict'].includes(b.status),
    )
  )
    throw new Error('This demo slot is occupied');
  const result: Booking = {
    ...data,
    id,
    amount: estimateLocal(data).amount,
    status: 'confirmed',
    mode: 'demo',
    createdAt: new Date().toISOString(),
  };
  await database.put('bookings', result);
  return result;
}
export async function syncQueue() {
  const database = await db();
  let synced = 0;
  for (const item of await database.getAll('queue')) {
    if (item.mode === 'live' && user?.id !== item.ownerId) continue;
    try {
      if (item.mode === 'demo') {
        const others = await database.getAll('bookings');
        if (
          others.some(
            (b) =>
              b.id !== item.id &&
              b.mode === 'demo' &&
              b.date === item.input.date &&
              b.time === item.input.time &&
              b.status === 'confirmed',
          )
        ) {
          const booking = await database.get('bookings', item.id);
          if (booking) await database.put('bookings', { ...booking, status: 'conflict' });
          await database.delete('queue', item.id);
          continue;
        }
        const booking = await database.get('bookings', item.id);
        if (booking) await database.put('bookings', { ...booking, status: 'confirmed' });
      } else {
        await api('/bookings', {
          method: 'POST',
          headers: { 'Idempotency-Key': item.id },
          body: JSON.stringify(item.input),
        });
        await database.delete('bookings', item.id);
      }
      await database.delete('queue', item.id);
      synced++;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const booking = await database.get('bookings', item.id);
        if (booking) await database.put('bookings', { ...booking, status: 'conflict' });
        await database.delete('queue', item.id);
      } else break;
    }
  }
  return synced;
}
export async function availableSlots(date: string, mode: 'demo' | 'live') {
  if (mode === 'live') return api<string[]>('/slots?date=' + encodeURIComponent(date));
  const rows = await localBookings();
  return ['10:00', '12:00', '14:00'].filter(
    (time) =>
      !rows.some(
        (b) =>
          b.mode === 'demo' &&
          b.date === date &&
          b.time === time &&
          b.status !== 'cancelled' &&
          b.status !== 'conflict',
      ),
  );
}
export async function downloadPdf(booking: Booking) {
  if (booking.mode === 'live' && booking.status !== 'queued') {
    await api('/auth/me');
    const response = await fetch(API + `/bookings/${booking.id}/pdf`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!response.ok) throw new Error('Document service unavailable');
    download(await response.blob(), `apex-${booking.id}.pdf`);
    return;
  }
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  try {
    const font = await fetch((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/fonts/DejaVuSans.ttf');
    const blob = await font.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    pdf.addFileToVFS('Apex.ttf', base64);
    pdf.addFont('Apex.ttf', 'Apex', 'normal');
    pdf.setFont('Apex');
  } catch {
    /* Built-in font remains available if the optional font is unavailable. */
  }
  pdf.setFontSize(22);
  pdf.text('APEX STUDIO', 20, 25);
  pdf.setFontSize(11);
  [
    'CONCEPT / DEMO PROJECT — ESTIMATE',
    `Reference: ${booking.id}`,
    `Customer: ${booking.name}`,
    `Service: ${booking.service}`,
    `Date: ${booking.date} ${booking.time}`,
    `Total: ${(booking.amount / 100).toFixed(2)} PLN`,
    'Formula version: 2026-01',
    'No actual services are being sold.',
  ].forEach((line, i) => pdf.text(line, 20, 45 + i * 12));
  pdf.save(`apex-${booking.id}.pdf`);
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function faqReply(message: string, locale: 'pl' | 'en' | 'ua') {
  return (
    faq.find((item) => item.keys.some((key) => message.toLowerCase().includes(key)))?.[locale] ??
    {
      pl: 'Wybierz usługę w formularzu. Dostępność jest demonstracyjna.',
      en: 'Choose a service in the booking form. Availability is illustrative.',
      ua: 'Вибери послугу у формі. Доступність демонстраційна.',
    }[locale]
  );
}
