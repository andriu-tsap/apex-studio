'use client';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  bookingSchema,
  defaultConfig,
  estimateLocal,
  services,
  products,
  cartTotal,
  money,
  type Booking,
  type BookingInput,
  type Cart,
} from '@apex/types';
import { type Locale, locales } from '@/i18n/config';
import { productText } from '@/i18n/product';
import {
  api,
  authenticate,
  availableSlots,
  backendAvailable,
  currentUser,
  downloadPdf,
  localBookings,
  logout,
  readCart,
  readConfig,
  restoreSession,
  saveCart,
  submitBooking,
  syncQueue,
  type User,
} from '@/lib/client';
import { Chatbot } from './support';
import audit from '@/data/performance.json';
import { sections, type Section } from '@/i18n/sections';
type Context = {
  locale: Locale;
  mode: 'demo' | 'live';
  user: User | null;
  setUser: (user: User | null) => void;
};
const dateAfter = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};
const sectionKey = {
  booking: 'booking',
  shop: 'shop',
  account: 'account',
  journal: 'journal',
  projects: 'projects',
  'under-the-hood': 'tech',
} as const;
export function ProductPage({ locale, section }: { locale: Locale; section: Section }) {
  const t = productText[locale];
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let active = true;
    backendAvailable().then(async (available) => {
      if (!active) return;
      setMode(available ? 'live' : 'demo');
      if (available) {
        const u = await restoreSession();
        if (active) setUser(u);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  const context = { locale, mode, user, setUser };
  return (
    <>
      <div className="demo-bar">
        <span className="status-dot" />
        {mode === 'demo' ? t.demo : t.live} · Concept / demo project
      </div>
      <header className="product-header shell">
        <a className="brand" href={`/${locale}/`}>
          APEX<span className="brand-sub">STUDIO</span>
        </a>
        <nav aria-label={t.home}>
          <a href={`/${locale}/`}>{t.home}</a>
          {sections.map((s) => (
            <a key={s} href={`/${locale}/${s}/`} aria-current={s === section ? 'page' : undefined}>
              {t[sectionKey[s]]}
            </a>
          ))}
        </nav>
        <div className="locale-switch">
          {locales.map((l) => (
            <a key={l} href={`/${l}/${section}/`} aria-current={l === locale ? 'page' : undefined}>
              {l.toUpperCase()}
            </a>
          ))}
        </div>
      </header>
      <main className="shell product-main">
        <p className="eyebrow">APEX / DIGITAL STUDIO</p>
        <h1>{t[sectionKey[section]]}</h1>
        <p className="product-disclaimer">{t.privacy}</p>
        {section === 'booking' ? (
          <BookingScreen {...context} />
        ) : section === 'shop' ? (
          <ShopScreen {...context} />
        ) : section === 'account' ? (
          <AccountScreen {...context} />
        ) : section === 'under-the-hood' ? (
          <Architecture {...context} />
        ) : (
          <Editorial locale={locale} kind={section} />
        )}
      </main>
      <footer className="shell product-footer">
        <p>Concept / demo project · Andrii Tsap</p>
        <a href="https://github.com/andriu-tsap" target="_blank" rel="noopener noreferrer">
          {t.source} ↗
        </a>
      </footer>
      <Chatbot locale={locale} />
    </>
  );
}
function BookingScreen({ locale, mode, user }: Context) {
  const t = productText[locale];
  const [config, setConfig] = useState(defaultConfig);
  const [result, setResult] = useState<Booking | null>(null);
  const [notice, setNotice] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [price, setPrice] = useState(65000);
  const [source, setSource] = useState('local');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof bookingSchema>, unknown, BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: '',
      email: '',
      service: 'detail',
      size: 'coupe',
      extra: false,
      date: dateAfter(1),
      time: '10:00',
      config: defaultConfig,
    },
  });
  const service = watch('service'),
    size = watch('size'),
    extra = watch('extra'),
    date = watch('date');
  useEffect(() => {
    const value = readConfig();
    setConfig(value);
    setValue('config', value);
    const query = new URLSearchParams(window.location.search);
    const date = query.get('date');
    const requestedService = query.get('service');
    if (requestedService && ['detail', 'ceramic', 'ppf'].includes(requestedService))
      setValue('service', requestedService as BookingInput['service']);
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) setValue('date', date);
    if (user) {
      setValue('name', user.name);
      setValue('email', user.email);
    }
  }, [setValue, user]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const input = { service, size, extra: extra ?? false };
      const local = estimateLocal(input);
      try {
        const result = await api<{ amount: number; source: string }>('/estimate', {
          method: 'POST',
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(1800),
        });
        if (active) {
          setPrice(result.amount);
          setSource(result.source);
        }
      } catch {
        if (active) {
          setPrice(local.amount);
          setSource('local');
        }
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [service, size, extra]);
  useEffect(() => {
    let active = true;
    availableSlots(date, mode)
      .then((values) => {
        if (active) {
          setSlots(values);
          if (values.length) setValue('time', values[0] as BookingInput['time']);
        }
      })
      .catch((error) => {
        if (active) {
          setSlots([]);
          setNotice(String(error));
        }
      });
    return () => {
      active = false;
    };
  }, [date, mode, setValue]);
  async function submit(input: BookingInput) {
    setNotice('');
    try {
      const booking = await submitBooking(input, mode);
      setResult(booking);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.error);
    }
  }
  if (result)
    return (
      <section className="confirmation">
        <span className="badge">
          {result.mode.toUpperCase()} / {result.status}
        </span>
        <h2>{t.confirmed}</h2>
        <p className="reference">{result.id}</p>
        <p>
          {result.date} · {result.time} · {money(result.amount, locale)}
        </p>
        <p>{result.status === 'queued' ? t.queued : t.demo}</p>
        <div className="email-preview">
          <p className="eyebrow">{t.mail}</p>
          <p>To: {result.email}</p>
          <h3>APEX Studio · {t.confirmed}</h3>
          <p>
            {result.name}, {result.date} / {result.time}
          </p>
          <p>
            {services.find((s) => s.id === result.service)?.name[locale]} —{' '}
            {money(result.amount, locale)}
          </p>
          <p>
            Concept / demo project. {t.status}: {result.status}
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => downloadPdf(result).catch((e) => setNotice(String(e)))}
        >
          {t.download}
        </button>
        <a className="button button-outline" href={`/${locale}/account/`}>
          {t.account}
        </a>
        <p role="status">{notice}</p>
      </section>
    );
  return (
    <div className="booking-layout">
      <form className="booking-form" onSubmit={handleSubmit(submit)} noValidate>
        <label>
          {t.service}
          <select {...register('service')}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name[locale]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.size}
          <select {...register('size')}>
            <option value="coupe">{t.coupon}</option>
            <option value="sedan">{t.sedan}</option>
            <option value="suv">{t.suv}</option>
          </select>
        </label>
        <label className="check-label">
          <input type="checkbox" {...register('extra')} />
          {t.extra}
        </label>
        <div className="form-row">
          <label>
            {t.name}
            <input {...register('name')} autoComplete="name" aria-invalid={Boolean(errors.name)} />
            {errors.name && <span className="field-error">{errors.name.message}</span>}
          </label>
          <label>
            {t.email}
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </label>
        </div>
        <div className="form-row">
          <label>
            {t.date}
            <input {...register('date')} type="date" min={dateAfter(1)} max={dateAfter(89)} />
          </label>
          <label>
            {t.time}
            <select {...register('time')} disabled={!slots.length}>
              {slots.map((slot) => (
                <option key={slot}>{slot}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="check-label">
          <input type="checkbox" {...register('consent')} />
          {t.consent}
        </label>
        {errors.consent && <span className="field-error">✓ {t.consent}</span>}
        {mode === 'live' && !user && (
          <a className="field-error" href={`/${locale}/account/`}>
            {t.needLogin}
          </a>
        )}
        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting || !slots.length || (mode === 'live' && !user)}
        >
          {isSubmitting ? t.loading : t.submit}
        </button>
        {notice && (
          <p role="alert" className="field-error">
            {notice}
          </p>
        )}
      </form>
      <aside className="estimate-card">
        <p className="eyebrow">{t.price}</p>
        <strong>{money(price, locale)}</strong>
        <p>
          {t.estimateSource}: {source} / 2026-01
        </p>
        <h3>{t.configuration}</h3>
        <div className="config-preview" style={{ background: config.color }} />
        <p>
          {config.preset.toUpperCase()} · {config.wheels} · {config.tint}
        </p>
        <p>{t.demo}</p>
      </aside>
    </div>
  );
}
function ShopScreen({ locale, mode, user }: Context) {
  const t = productText[locale];
  const [cart, setCart] = useState<Cart>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setCart(readCart()), []);
  function update(next: Cart) {
    setCart(next);
    try {
      saveCart(next);
    } catch {
      setNotice(t.error);
    }
  }
  function add(id: Cart[number]['id']) {
    const old = cart.find((i) => i.id === id);
    update(
      old
        ? cart.map((i) => (i.id === id ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i))
        : [...cart, { id, quantity: 1 }],
    );
  }
  function demoOrder() {
    try {
      const saved = JSON.parse(localStorage.getItem('apex-orders') || '[]') as unknown;
      const orders = Array.isArray(saved) ? saved : [];
      localStorage.setItem(
        'apex-orders',
        JSON.stringify([
          ...orders,
          {
            id: crypto.randomUUID(),
            mode: 'demo',
            status: 'demo_no_payment',
            amount: cartTotal(cart),
            items: cart,
            createdAt: new Date().toISOString(),
          },
        ]),
      );
      update([]);
      setNotice(t.ordered);
    } catch {
      setNotice(t.error);
    }
  }
  async function checkout() {
    setBusy(true);
    setNotice('');
    try {
      const result = await api<{ url: string }>('/checkout', {
        method: 'POST',
        body: JSON.stringify({ items: cart }),
      });
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com')
        throw new Error('Invalid checkout URL');
      window.location.assign(url.href);
    } catch (error) {
      setNotice(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="shop-filter">
        <label>
          {t.search}
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label>
          {t.service}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">{t.all}</option>
            <option value="care">{t.care}</option>
            <option value="accessories">{t.accessories}</option>
          </select>
        </label>
      </div>
      <div className="shop-layout">
        <div className="product-grid">
          {products
            .filter(
              (p) =>
                (category === 'all' || p.category === category) &&
                p.name[locale].toLowerCase().includes(q.toLowerCase()),
            )
            .map((p) => (
              <article className="catalog-card" key={p.id}>
                <div
                  className={'product-art ' + (p.category === 'accessories' ? 'accessory-art' : '')}
                  style={{ '--product-color': p.color } as React.CSSProperties}
                >
                  <span>APEX</span>
                  <small>{p.id.toUpperCase()}</small>
                </div>
                <span className="tiny">DEMO / {p.category.toUpperCase()}</span>
                <h2>{p.name[locale]}</h2>
                <p>{money(p.price, locale)}</p>
                <button className="button button-outline" onClick={() => add(p.id)}>
                  {t.add} +
                </button>
              </article>
            ))}
        </div>
        <aside className="cart-panel">
          <h2>{t.cart}</h2>
          {!cart.length && <p>{t.empty}</p>}
          {cart.map((item) => {
            const p = products.find((p) => p.id === item.id)!;
            return (
              <div className="cart-row" key={item.id}>
                <p>{p.name[locale]}</p>
                <label>
                  ×{' '}
                  <input
                    type="number"
                    min="1"
                    max="20"
                    aria-label={p.name[locale]}
                    value={item.quantity}
                    onChange={(e) =>
                      update(
                        cart.map((i) =>
                          i.id === item.id
                            ? {
                                ...i,
                                quantity: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                              }
                            : i,
                        ),
                      )
                    }
                  />
                </label>
                <strong>{money(p.price * item.quantity, locale)}</strong>
                <button
                  aria-label={`${t.remove}: ${p.name[locale]}`}
                  onClick={() => update(cart.filter((i) => i.id !== item.id))}
                >
                  ×
                </button>
              </div>
            );
          })}
          <p className="cart-total">
            {t.total}
            <strong>{money(cartTotal(cart), locale)}</strong>
          </p>
          <button className="button button-primary" disabled={!cart.length} onClick={demoOrder}>
            {t.demoCheckout}
          </button>
          <button
            className="button button-outline"
            disabled={!cart.length || mode !== 'live' || !user || busy}
            onClick={checkout}
          >
            {t.stripe}
          </button>
          <p className="muted">{t.demo}</p>
          {mode === 'live' && !user && <a href={`/${locale}/account/`}>{t.needLogin}</a>}
        </aside>
      </div>
      <p role="status" className="notice">
        {notice}
      </p>
    </>
  );
}
function AccountScreen({ locale, mode, user, setUser }: Context) {
  const t = productText[locale];
  const [rows, setRows] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<
    Array<{ id: string; amount: number; status: string; mode?: string }>
  >([]);
  const [notice, setNotice] = useState('');
  const [demo, setDemo] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      let data = await localBookings();
      if (user && !demo)
        data = [
          ...data.filter((b) => b.mode === 'live' && b.ownerId === user.id),
          ...(await api<Booking[]>('/bookings')),
        ];
      else data = data.filter((b) => b.mode === 'demo');
      setRows(data);
      if (user && !demo) setOrders(await api('/orders'));
      else {
        const value = JSON.parse(localStorage.getItem('apex-orders') || '[]') as unknown;
        setOrders(Array.isArray(value) ? value : []);
      }
    } catch (error) {
      setNotice(String(error));
    }
  }, [user, demo]);
  useEffect(() => {
    if (demo || user) load();
  }, [demo, user, load]);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const data = await authenticate(
        { email, password, ...(registering ? { name } : {}) },
        registering,
      );
      setUser(data);
      setPassword('');
      setDemo(false);
    } catch (error) {
      setNotice(String(error));
    } finally {
      setBusy(false);
    }
  }
  async function sync() {
    try {
      await syncQueue();
      await load();
    } catch (error) {
      setNotice(String(error));
    }
  }
  async function clear() {
    const { openDB } = await import('idb');
    const db = await openDB('apex-studio');
    const bookings = (await db.getAll('bookings')) as Booking[];
    for (const b of bookings)
      if (b.mode === 'demo') {
        await db.delete('bookings', b.id);
        await db.delete('queue', b.id);
      }
    localStorage.removeItem('apex-orders');
    await load();
  }
  return (
    <>
      {!user && !demo ? (
        <div className="account-login">
          <form onSubmit={login}>
            {registering && (
              <label>
                {t.name}
                <input
                  value={name}
                  required
                  minLength={2}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label>
              {t.email}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </label>
            <label>
              {t.password}
              <input
                type="password"
                minLength={registering ? 12 : 1}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={registering ? 'new-password' : 'current-password'}
              />
            </label>
            <button className="button button-primary" disabled={mode !== 'live' || busy}>
              {registering ? t.register : t.login}
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setRegistering(!registering)}
            >
              {registering ? t.login : t.register}
            </button>
          </form>
          <button className="button button-outline" onClick={() => setDemo(true)}>
            {t.demoAccount}
          </button>
        </div>
      ) : (
        <>
          <div className="account-toolbar">
            <span className="badge">{demo ? 'DEMO' : user?.email}</span>
            <button className="button button-outline" onClick={sync}>
              {t.sync}
            </button>
            <button
              className="button button-outline"
              onClick={async () => {
                if (!demo) await logout();
                setUser(null);
                setDemo(false);
                setRows([]);
              }}
            >
              {t.logout}
            </button>
            {demo && (
              <button className="text-link" onClick={clear}>
                {t.clear}
              </button>
            )}
          </div>
          <h2>{t.bookings}</h2>
          <div className="booking-history">
            {!rows.length && <p>{t.empty}</p>}
            {rows.map((b) => (
              <article key={b.id}>
                <div>
                  <span className="badge">
                    {b.mode.toUpperCase()} / {b.status}
                  </span>
                  <h3>{services.find((s) => s.id === b.service)?.name[locale]}</h3>
                  <p>
                    {b.date} · {b.time} · {money(b.amount, locale)}
                  </p>
                  <small>{b.id}</small>
                </div>
                <button
                  className="button button-outline"
                  onClick={() => downloadPdf(b).catch((e) => setNotice(String(e)))}
                >
                  {t.download}
                </button>
              </article>
            ))}
          </div>
          <h2>{t.orders}</h2>
          <div className="booking-history">
            {!orders.length && <p>{t.empty}</p>}
            {orders.map((o) => (
              <article key={o.id}>
                <p>
                  {o.mode || 'live'} / {o.status}
                </p>
                <strong>{money(o.amount, locale)}</strong>
              </article>
            ))}
          </div>
        </>
      )}
      <p role="status" className="notice">
        {notice}
      </p>
    </>
  );
}
function Editorial({ locale, kind }: { locale: Locale; kind: 'journal' | 'projects' }) {
  const t = productText[locale];
  const [live, setLive] = useState(false);
  const [posts, setPosts] = useState<Array<{ id: number; title: string; content: string }>>([]);
  const titles = {
    pl: [
      'Jak działa ochrona ceramiczna',
      'Przygotowanie lakieru krok po kroku',
      'GT-class: studium koloru',
    ],
    en: [
      'How ceramic protection works',
      'Paint preparation, step by step',
      'GT-class: a study in color',
    ],
    ua: [
      'Як працює керамічний захист',
      'Підготовка лаку крок за кроком',
      'GT-class: дослідження кольору',
    ],
  };
  const paragraphs = {
    pl: [
      'Ochrona zaczyna się od przygotowania. Mycie, dekontaminacja i korekta tworzą podstawę dla równomiernej powłoki. To artykuł demonstracyjny, a nie dokumentacja wykonanej usługi.',
      'Każdy etap ma znaczenie: kontrola powierzchni, dobór narzędzi oraz weryfikacja w świetle inspekcyjnym. Przykład przedstawia możliwy proces studia.',
      'Jasny lakier podkreśla linie, a ciemne detale tworzą kontrast. Zobacz zmiany w konfiguratorze. To autorska koncepcja wizualna, bez realnego klienta.',
    ],
    en: [
      'Protection begins with preparation. Washing, decontamination and correction provide a foundation for an even coating. This is demo editorial content, not a record of a real service.',
      'Each step matters: surface inspection, tool selection and verification under inspection lighting. This example describes a possible studio workflow.',
      'Light paint reveals the body lines while dark accents create contrast. Explore the configuration. This is a visual concept, with no real customer.',
    ],
    ua: [
      'Захист починається з підготовки. Миття, деконтамінація та корекція створюють основу для рівномірного покриття. Це демостаття, а не звіт про реальну послугу.',
      'Кожен етап важливий: огляд поверхні, вибір інструментів і перевірка під інспекційним світлом. Приклад показує можливий процес студії.',
      'Світлий кузов підкреслює лінії, а темні деталі створюють контраст. Переглянь зміни в конфігураторі. Це візуальна концепція без реального клієнта.',
    ],
  };
  useEffect(() => {
    let active = true;
    const base = process.env.NEXT_PUBLIC_WP_URL || 'http://localhost:8080';
    fetch(`${base}/wp-json/wp/v2/${kind === 'journal' ? 'posts' : 'apex_realizacja'}?per_page=6`, {
      signal: AbortSignal.timeout(2500),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const value = (await r.json()) as Array<{
          id: number;
          title: { rendered: string };
          content: { rendered: string };
        }>;
        if (!Array.isArray(value) || !value.length) throw new Error();
        const plain = (html: string) =>
          new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
        if (active) {
          setPosts(
            value.map((p) => ({
              id: p.id,
              title: plain(p.title.rendered),
              content: plain(p.content.rendered),
            })),
          );
          setLive(true);
        }
      })
      .catch(() => {
        if (active)
          setPosts(
            titles[locale].map((title, i) => ({ id: i, title, content: paragraphs[locale][i] })),
          );
      });
    return () => {
      active = false;
    };
  }, [locale, kind]);
  return (
    <>
      <p className="badge">{live ? 'WORDPRESS / LIVE' : t.cms}</p>
      <div className="editorial-grid">
        {posts.map((post, i) => (
          <article key={post.id}>
            <div className={`editorial-art editorial-art-${i % 3}`} aria-hidden="true">
              {kind === 'projects' ? 'GT–0' + (i + 1) : 'APEX / ' + String(i + 1).padStart(2, '0')}
            </div>
            <p className="eyebrow">{kind === 'projects' ? 'CONCEPT STUDY' : 'STUDIO JOURNAL'}</p>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </article>
        ))}
      </div>
    </>
  );
}
function Architecture({ locale }: Context) {
  const t = productText[locale];
  const [selected, setSelected] = useState('web');
  const nodes = [
    {
      id: 'web',
      name: 'Next.js 15',
      path: 'apps/web',
      detail: 'React · TypeScript · next-intl · Three.js · PWA',
    },
    {
      id: 'admin',
      name: 'Angular CRM',
      path: 'apps/admin',
      detail: 'Standalone · signals · Material · CDK drag & drop',
    },
    {
      id: 'api',
      name: 'Express API',
      path: 'apps/api',
      detail: 'JWT · refresh rotation · Zod · OpenAPI · Stripe test',
    },
    {
      id: 'db',
      name: 'PostgreSQL',
      path: 'apps/api/prisma',
      detail: 'Prisma migrations · unique active slots · JOIN · SUM OVER',
    },
    {
      id: 'python',
      name: 'FastAPI',
      path: 'apps/py-service',
      detail: 'Versioned estimates · Unicode PDF · Excel · controlled demo parser',
    },
    {
      id: 'cms',
      name: 'WordPress',
      path: 'apps/wp-plugin',
      detail: 'Headless REST · Realizacje custom post type · metadata',
    },
    {
      id: 'widget',
      name: 'Web Component',
      path: 'apps/widget',
      detail: 'HTML · CSS · Vanilla JavaScript · Shadow DOM',
    },
  ];
  const node = nodes.find((n) => n.id === selected)!;
  return (
    <>
      <div className="architecture-map">
        {nodes.map((n) => (
          <button
            key={n.id}
            className={selected === n.id ? 'selected' : ''}
            onClick={() => setSelected(n.id)}
          >
            <small>{n.id.toUpperCase()}</small>
            <strong>{n.name}</strong>
            <span>{n.path}</span>
          </button>
        ))}
      </div>
      <article className="architecture-detail">
        <p className="eyebrow">{node.path}</p>
        <h2>{node.name}</h2>
        <p>{node.detail}</p>
        <code>{node.path}</code>
        <p>
          {t.source}:{' '}
          <a href="https://github.com/andriu-tsap" target="_blank" rel="noopener noreferrer">
            github.com/andriu-tsap ↗
          </a>
        </p>
      </article>
      <section className="audit-panel">
        <p className="eyebrow">
          {
            {
              pl: 'Lokalny audyt mobilny',
              en: 'Local mobile audit',
              ua: 'Локальний мобільний аудит',
            }[locale]
          }{' '}
          · {audit.tool} · {audit.date}
        </p>
        <div className="audit-scores">
          {Object.entries(audit.scores).map(([key, value]) => (
            <div key={key}>
              <strong>{value}</strong>
              <span>{key}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="tech-grid">
        <article className="tech-card">
          <h3>Validation</h3>
          <p>
            TypeScript strict · Vitest · pytest · Playwright scenarios · CI. Local mobile audit and
            conditions are recorded above.
          </p>
        </article>
        <article className="tech-card">
          <h3>Offline → sync</h3>
          <p>Service Worker → IndexedDB queue → idempotency key → API → PostgreSQL unique slot.</p>
        </article>
        <article className="tech-card">
          <h3>Demo adapters</h3>
          <p>Explicit local data · no fake payments · controlled parser source · rule-based FAQ.</p>
        </article>
      </div>
      <div className="hero-actions">
        <a
          className="button button-primary"
          href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:4200'}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.admin} ↗
        </a>
        <a
          className="button button-outline"
          href={(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/docs'}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.apiDocs} ↗
        </a>
      </div>
    </>
  );
}
