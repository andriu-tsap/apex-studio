'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { htmlLanguages, locales, type Locale } from '@/i18n/config';
import { CarStage } from './car-stage';
import { Arrow, Icon } from './icons';
import { ProductNavigation, Chatbot } from './support';
import { productText } from '@/i18n/product';

export function Home({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const reduced = useReducedMotion();
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const links = [
    { href: '#experience', label: t('navExperience') },
    { href: '#services', label: t('navServices') },
    { href: '#process', label: t('navProcess') },
    { href: `/${locale}/under-the-hood/`, label: t('navTech') },
    { href: `/${locale}/booking/`, label: productText[locale].booking },
    { href: `/${locale}/shop/`, label: productText[locale].shop },
    { href: `/${locale}/account/`, label: productText[locale].account },
  ];
  const openCommand = () => {
    setQuery('');
    dialog.current?.showModal();
    search.current?.focus();
  };
  useEffect(() => {
    document.documentElement.lang = htmlLanguages[locale];
    setTheme(document.documentElement.dataset.theme ?? 'dark');
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else {
          setQuery('');
          dialog.current?.showModal();
          search.current?.focus();
        }
      }
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [locale]);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('apex-theme', next);
    } catch {
      /* Theme remains available when storage is blocked. */
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        {t('skip')}
      </a>
      <div className="demo-bar">
        <span className="status-dot" />
        {t('demo')}
        <span className="demo-edition">DIGITAL EDITION / 01</span>
      </div>
      <header className="site-header shell">
        <a className="brand" href={`/${locale}/`} aria-label="Λ APEX Studio">
          <span className="brand-mark" aria-hidden="true">
            Λ
          </span>
          <span>
            APEX<span className="brand-sub">STUDIO</span>
          </span>
        </a>
        <nav className={menu ? 'main-nav open' : 'main-nav'} aria-label={t('command')}>
          {links.slice(0, 4).map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenu(false)}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="header-tools">
          <div className="locale-switch" aria-label="Language">
            {locales.map((item) => (
              <a
                key={item}
                href={`/${item}/`}
                hrefLang={htmlLanguages[item]}
                lang={htmlLanguages[item]}
                aria-current={item === locale ? 'page' : undefined}
              >
                {item.toUpperCase()}
              </a>
            ))}
          </div>
          <button
            className="icon-button theme-button"
            onClick={toggleTheme}
            aria-label={t('theme')}
            title={t('theme')}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button
            className="icon-button command-trigger"
            onClick={openCommand}
            aria-label={t('command')}
            title="Ctrl / Cmd + K"
          >
            <Icon name="command" />
          </button>
          <button
            className="icon-button mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label={menu ? t('close') : t('menu')}
          >
            <Icon name={menu ? 'close' : 'menu'} />
          </button>
        </div>
      </header>
      <ProductNavigation locale={locale} />
      <main id="main">
        <section className="hero shell" aria-labelledby="hero-heading">
          <motion.div className="hero-copy" initial={false} animate={{ opacity: 1, y: 0 }}>
            <p className="eyebrow">
              <span className="eyebrow-line" />
              {t('eyebrow')}
            </p>
            <h1 id="hero-heading">
              <span>{t('headline1')}</span>
              <span className="accent-text">{t('headline2')}</span>
            </h1>
            <p className="hero-intro">{t('intro')}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#experience">
                {t('primary')}
                <Arrow />
              </a>
              <a className="text-link" href="#process">
                {t('secondary')}
                <Arrow />
              </a>
            </div>
            <p className="hero-note">
              <span className="note-plus">+</span>
              {t('heroNote')}
            </p>
          </motion.div>
          <CarStage />
        </section>
        <div className="spec-strip shell">
          {[1, 2, 3].map((i) => (
            <div className="spec" key={i}>
              <span>{t(`spec${i}`)}</span>
              <strong>{t(`spec${i}value`)}</strong>
            </div>
          ))}
          <a href="#services" className="scroll-cue" aria-label={t('navServices')}>
            <span>↓</span>
          </a>
        </div>
        <section className="section shell" id="services" aria-labelledby="services-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">{t('servicesEyebrow')}</p>
              <h2 id="services-title">{t('servicesTitle')}</h2>
            </div>
            <p className="section-intro">{t('servicesIntro')}</p>
          </div>
          <div className="services-grid">
            {[1, 2, 3].map((i) => (
              <motion.article
                className={`service-card service-${i}`}
                key={i}
                initial={reduced ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : (i - 1) * 0.08 }}
              >
                <div className="service-top">
                  <span className="tiny">0{i}</span>
                  <span className="service-symbol" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <div className="service-art" aria-hidden="true">
                  <div className="art-layer layer-one" />
                  <div className="art-layer layer-two" />
                  <div className="art-layer layer-three" />
                </div>
                <span className="service-tag">{t(`service${i}tag`)}</span>
                <h3>{t(`service${i}`)}</h3>
                <p>{t(`service${i}text`)}</p>
              </motion.article>
            ))}
          </div>
        </section>
        <section className="process-section" id="process" aria-labelledby="process-title">
          <div className="shell process-layout">
            <div>
              <p className="eyebrow">{t('processEyebrow')}</p>
              <h2 id="process-title">{t('processTitle')}</h2>
              <p className="process-note">{t('processNote')}</p>
              <a className="text-link" href="#experience">
                {t('primary')}
                <Arrow />
              </a>
            </div>
            <ol className="process-list">
              {[1, 2, 3].map((i) => (
                <li key={i}>
                  <span className="process-number">0{i}</span>
                  <div>
                    <h3>{t(`process${i}`)}</h3>
                    <p>{t(`process${i}text`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section
          className="section shell tech-section"
          id="technology"
          aria-labelledby="tech-title"
        >
          <div className="section-head">
            <div>
              <p className="eyebrow">{t('techEyebrow')}</p>
              <h2 id="tech-title">{t('techTitle')}</h2>
            </div>
            <p className="section-intro">{t('techIntro')}</p>
          </div>
          <div className="tech-grid">
            {[
              { title: 'Next.js / TypeScript', key: 'techWeb', label: '01 — FRONTEND' },
              { title: 'React Three Fiber', key: 'tech3d', label: '02 — REALTIME 3D' },
              { title: 'PL / EN / UA', key: 'techAccess', label: '03 — EXPERIENCE' },
            ].map((item) => (
              <article className="tech-card" key={item.key}>
                <span className="tiny">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{t(item.key)}</p>
              </article>
            ))}
          </div>
          <div className="roadmap">
            <span className="tiny">{t('next')}</span>
            <p>{t('nextText')}</p>
          </div>
        </section>
      </main>
      <footer className="footer shell">
        <div className="footer-top">
          <a className="brand" href={`/${locale}/`}>
            APEX<span className="brand-sub">STUDIO</span>
          </a>
          <p>{t('footerTitle')}</p>
          <a
            href="https://github.com/andriu-tsap"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            {t('source')}
            <Arrow />
          </a>
        </div>
        <div className="footer-bottom">
          <p>{t('footerText')}</p>
          <p>
            {t('author')}{' '}
            <a href="https://github.com/andriu-tsap" target="_blank" rel="noopener noreferrer">
              Andrii Tsap
            </a>
          </p>
          <button className="command-footer" onClick={openCommand}>
            {t('command')} <kbd>⌘ / Ctrl K</kbd>
          </button>
        </div>
      </footer>
      <Chatbot locale={locale} />
      <dialog
        ref={dialog}
        className="command-dialog"
        aria-labelledby="command-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="command-content">
          <div className="command-header">
            <h2 id="command-title">{t('command')}</h2>
            <button
              className="icon-button"
              aria-label={t('close')}
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>
          <input
            ref={search}
            aria-label={t('commandHint')}
            placeholder={t('commandHint')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <nav>
            {links
              .filter((link) => link.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
              .map((link) => (
                <a key={link.href} href={link.href} onClick={() => dialog.current?.close()}>
                  {link.label}
                  <Arrow />
                </a>
              ))}
            {!links.some((link) =>
              link.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
            ) && <p>{t('noResults')}</p>}
          </nav>
          <p className="command-tip">Tab ↹ · Enter ↵ · Esc</p>
        </div>
      </dialog>
    </>
  );
}
