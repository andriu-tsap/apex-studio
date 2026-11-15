'use client';
import { useEffect, useState } from 'react';
import { productText } from '@/i18n/product';
import type { Locale } from '@/i18n/config';
import {
  api,
  availableSlots,
  backendAvailable,
  faqReply,
  restoreSession,
  syncQueue,
} from '@/lib/client';
export function PWABoot() {
  useEffect(() => {
    const sync = async () => {
      if (process.env.NEXT_PUBLIC_API_URL) await restoreSession();
      await syncQueue().catch(() => 0);
    };
    if (navigator.onLine) sync();
    window.addEventListener('online', sync);
    const message = (event: MessageEvent) => {
      if (event.data === 'SYNC_BOOKINGS') sync();
    };
    navigator.serviceWorker?.addEventListener('message', message);
    const registration = window.setTimeout(() => {
      if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator)
        navigator.serviceWorker
          .register((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/sw.js')
          .catch(() => undefined);
    }, 4000);
    return () => {
      clearTimeout(registration);
      window.removeEventListener('online', sync);
      navigator.serviceWorker?.removeEventListener('message', message);
    };
  }, []);
  return null;
}
export function ProductNavigation({ locale }: { locale: Locale }) {
  const t = productText[locale];
  return (
    <nav className="module-nav shell" aria-label="APEX modules">
      {(['booking', 'shop', 'account', 'journal', 'projects'] as const).map((key) => (
        <a key={key} href={`/${locale}/${key}/`}>
          {t[key]}
        </a>
      ))}
      <a href={`/${locale}/under-the-hood/`}>{t.tech} ↗</a>
      <a
        href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:4200'}
        target="_blank"
        rel="noopener noreferrer"
      >
        CRM ↗
      </a>
    </nav>
  );
}
export function Chatbot({ locale }: { locale: Locale }) {
  const t = productText[locale];
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [pending, setPending] = useState(false);
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null);
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setPending(true);
    const text = message;
    setMessage('');
    try {
      const result = await api<{ reply: string }>('/faq', {
        method: 'POST',
        body: JSON.stringify({ message: text, locale }),
        signal: AbortSignal.timeout(1500),
      });
      setReply(result.reply);
    } catch {
      setReply(faqReply(text, locale));
    } finally {
      setPending(false);
    }
  }
  async function suggest() {
    setPending(true);
    try {
      const mode = (await backendAvailable()) ? 'live' : 'demo';
      for (let i = 1; i <= 7; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);
        const date = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Warsaw',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(day);
        const times = await availableSlots(date, mode);
        if (times.length) {
          setSlot({ date, time: times[0] });
          break;
        }
      }
    } catch {
      setReply(t.error);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-panel" aria-label={t.faq}>
          <div className="chat-title">
            <h2>{t.faq}</h2>
            <button aria-label={t.close} onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <p className="tiny">FAQ / RULES · CONCEPT / DEMO</p>
          <p className="chat-reply" role="status">
            {pending ? t.loading : reply || t.privacy}
          </p>
          <button className="text-link" onClick={suggest} disabled={pending}>
            {t.slot} ↗
          </button>
          {slot && (
            <a
              className="slot-suggestion"
              href={`/${locale}/booking/?date=${slot.date}&time=${slot.time}`}
            >
              {slot.date} · {slot.time} →
            </a>
          )}
          <form onSubmit={ask}>
            <label className="sr-only" htmlFor="faq-message">
              {t.message}
            </label>
            <input
              id="faq-message"
              value={message}
              maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.message}
            />
            <button disabled={pending || !message.trim()} type="submit">
              {t.send}
            </button>
          </form>
        </section>
      )}
      <button
        className="chat-toggle"
        aria-label={t.faq}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? '×' : '✳'}
        <span>{t.faq}</span>
      </button>
    </div>
  );
}
