'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { defaultConfig, type CarConfiguration } from '@apex/types';
import { readConfig, saveConfig } from '@/lib/client';
import { productText } from '@/i18n/product';
import type { Locale } from '@/i18n/config';
import { Icon } from './icons';
const Scene = dynamic(() => import('./car-scene'), { ssr: false });
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function CarStage() {
  const t = useTranslations();
  const rawLocale = useLocale();
  const locale = (rawLocale === 'uk' ? 'ua' : rawLocale) as Locale;
  const pt = productText[locale];
  const reduced = useReducedMotion();
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);
  const [configuration, setConfiguration] = useState<CarConfiguration>(defaultConfig);
  const color = configuration.color;
  const setColor = (color: string) => setConfiguration((c) => ({ ...c, color, preset: 'custom' }));
  const [hotspots, setHotspots] = useState(false);
  useEffect(() => setConfiguration(readConfig()), []);
  useEffect(() => saveConfig(configuration), [configuration]);
  const [resetKey, setResetKey] = useState(0);
  const [notice, setNotice] = useState('');
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);
  useEffect(() => {
    const simplified =
      navigator.hardwareConcurrency <= 4 || window.matchMedia('(max-width:640px)').matches;
    setLowPower(simplified);
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!gl) {
      setFailed(true);
      return;
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    setLowPower(
      navigator.hardwareConcurrency <= 4 || window.matchMedia('(max-width: 640px)').matches,
    );
    const timer = window.setTimeout(() => {
      if (!simplified) setLoad(true);
    }, 1200);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    if (stage.current) observer.observe(stage.current);
    const visibility = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);
  const onCanvas = useCallback(
    (element: HTMLCanvasElement) => {
      canvas.current = element;
      element.setAttribute('aria-label', t('drag'));
    },
    [t],
  );
  function save() {
    try {
      const element = canvas.current;
      if (!element) throw new Error('Canvas unavailable');
      element.toBlob((blob) => {
        if (!blob) {
          setNotice(t('error'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'apex-gt-01.png';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice(t('saved'));
      }, 'image/png');
    } catch {
      setNotice(t('error'));
    }
  }
  const colors = [
    { value: '#dfe7ec', label: t('colorIce') },
    { value: '#00c9d8', label: t('colorTeal') },
    { value: '#d52e47', label: t('colorRed') },
    { value: '#353e4b', label: t('colorDark') },
  ];
  return (
    <div ref={stage} className="car-stage" id="experience" aria-label={t('navExperience')}>
      <div className="stage-top">
        <span className="tiny">
          <span className={ready ? 'status-dot' : 'status-dot muted-dot'} />
          {ready ? t('live') : failed || (!load && lowPower) ? t('static') : t('loading')}
        </span>
        <span className="stage-code">01 — 04</span>
      </div>
      <div className="stage-word" aria-hidden="true">
        GT–01
      </div>
      <div className="car-viewport" role="group" aria-label={`${t('model')}. ${t('drag')}`}>
        {!ready && (
          <Image
            src={(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/car-fallback.svg'}
            alt={t('model')}
            width={1000}
            height={620}
            priority
            className="car-fallback"
          />
        )}
        {!load && lowPower && !failed && (
          <button className="enable-3d button button-outline" onClick={() => setLoad(true)}>
            3D ↗
          </button>
        )}
        {load && !failed && (
          <SceneBoundary onFailure={onFailure}>
            <Scene
              configuration={configuration}
              hotspots={hotspots}
              labels={{ wheels: pt.wheels, tint: pt.tint, body: pt.configuration }}
              playing={playing && visible && !reduced}
              resetKey={resetKey}
              lowPower={lowPower}
              onReady={onReady}
              onFailure={onFailure}
              onCanvas={onCanvas}
            />
          </SceneBoundary>
        )}
      </div>
      <div className="stage-bottom">
        <div>
          <p className="model-name">{t('model')}</p>
          <p className="drag-hint">{failed ? t('staticNote') : t('drag')}</p>
        </div>
        <div className="scene-tools">
          <button
            className="icon-button"
            disabled={!ready || Boolean(reduced)}
            title={playing ? t('pause') : t('play')}
            aria-label={playing ? t('pause') : t('play')}
            onClick={() => setPlaying(!playing)}
          >
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <button
            className="icon-button"
            disabled={!ready}
            title={t('reset')}
            aria-label={t('reset')}
            onClick={() => setResetKey((value) => value + 1)}
          >
            <Icon name="rotate" />
          </button>
          <button
            className="icon-button"
            disabled={!ready}
            title={t('save')}
            aria-label={t('save')}
            onClick={save}
          >
            <Icon name="download" />
          </button>
        </div>
      </div>
      <fieldset className="colors">
        <legend>{t('color')}</legend>
        <div className="swatches">
          {colors.map((c) => (
            <label key={c.value} className="swatch" title={c.label}>
              <input
                type="radio"
                name="body-color"
                value={c.value}
                checked={color === c.value}
                disabled={failed}
                onChange={() => setColor(c.value)}
              />
              <span style={{ background: c.value }} />
              <span className="sr-only">{c.label}</span>
            </label>
          ))}
          <span className="color-name">{colors.find((c) => c.value === color)?.label}</span>
        </div>
      </fieldset>
      <div className="config-controls">
        <label>
          {pt.preset}
          <select
            aria-label={pt.preset}
            value={configuration.preset}
            onChange={(e) => {
              const preset = e.target.value as CarConfiguration['preset'];
              setConfiguration(
                preset === 'track'
                  ? { color: '#d52e47', wheels: 'black', caliper: '#b6ff3b', tint: 'light', preset }
                  : preset === 'stealth'
                    ? {
                        color: '#353e4b',
                        wheels: 'black',
                        caliper: '#ff425f',
                        tint: 'dark',
                        preset,
                      }
                    : { ...defaultConfig, preset: 'street' },
              );
            }}
          >
            <option value="street">Street</option>
            <option value="track">Track</option>
            <option value="stealth">Stealth</option>
            <option value="custom" disabled>
              Custom
            </option>
          </select>
        </label>
        <label>
          {pt.wheels}
          <select
            value={configuration.wheels}
            onChange={(e) =>
              setConfiguration((c) => ({
                ...c,
                wheels: e.target.value as CarConfiguration['wheels'],
                preset: 'custom',
              }))
            }
          >
            <option value="silver">{pt.silver}</option>
            <option value="black">{pt.black}</option>
          </select>
        </label>
        <label>
          {pt.caliper}
          <input
            type="color"
            value={configuration.caliper}
            onChange={(e) =>
              setConfiguration((c) => ({ ...c, caliper: e.target.value, preset: 'custom' }))
            }
          />
        </label>
        <label>
          {pt.tint}
          <select
            value={configuration.tint}
            onChange={(e) =>
              setConfiguration((c) => ({
                ...c,
                tint: e.target.value as CarConfiguration['tint'],
                preset: 'custom',
              }))
            }
          >
            <option value="light">{pt.light}</option>
            <option value="dark">{pt.dark}</option>
          </select>
        </label>
      </div>
      <div className="config-actions">
        <button
          className="text-link"
          aria-pressed={hotspots}
          onClick={() => setHotspots(!hotspots)}
        >
          {pt.hotspots} +
        </button>
        <a className="button button-primary" href={`/${locale}/booking/`}>
          {pt.bookConfig} ↗
        </a>
      </div>
      <p className="model-credit">{t('modelCaption')}</p>
      {reduced && <p className="motion-note">{t('reduced')}</p>}
      <span className="sr-only" aria-live="polite">
        {notice}
      </span>
    </div>
  );
}
