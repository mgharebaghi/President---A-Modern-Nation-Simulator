import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { buildings } from '../data/capital';
import { clockHour, simulationDate } from '../engine/calendar';
import type { GameSpeed } from '../engine/types';
import { formatDate, formatNumber, formatTime } from '../i18n/format';
import { translator, type Language, type MessageKey } from '../i18n/messages';
import type { Quality, RenderStats } from '../render/city';
import type { CameraActions } from './CityView';
import { Icon } from './Icon';
import { useSimulation } from './useSimulation';

const CityView = lazy(() => import('./CityView'));
type Panel = 'settings' | 'guide' | null;

function readLanguage(): Language {
  try { return localStorage.getItem('president-language') === 'en' ? 'en' : 'fa'; }
  catch { return 'fa'; }
}

export default function App() {
  const [language, setLanguage] = useState<Language>(readLanguage);
  const [quality, setQuality] = useState<Quality>('high');
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [renderError, setRenderError] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { state: world, command, ready, error } = useSimulation();
  const camera = useRef<CameraActions>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const t = translator(language);
  const number = (value: number) => formatNumber(value, language);
  const date = simulationDate(world.elapsedHours);
  const hour = clockHour(world.elapsedHours);
  const period: MessageKey = hour >= 7 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : hour >= 5 && hour < 7 ? 'dawn' : 'night';
  const building = buildings.find(item => item.id === selected);
  const onSelect = useCallback((id: string) => { setSelected(id); setDetailsOpen(true); }, []);
  const onFailure = useCallback(() => setRenderError(true), []);
  const onReady = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    document.title = `PRESIDENT · ${translator(language)('capital')}`;
    try { localStorage.setItem('president-language', language); } catch { /* Language still works without storage. */ }
  }, [language]);

  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);

  return <div className="app-shell">
    <header className="topbar">
      <a className="wordmark" href="#capital" aria-label="PRESIDENT"><span className="brand-seal"><Icon name="building" size={25} /></span><span dir="ltr">PRESIDENT<small>A MODERN NATION SIMULATOR</small></span></a>
      <div className="nation"><span className="nation-flag"><i /></span><span>{t('republic')}<small>{t('capitalSub')}</small></span></div>
      <div className="header-actions">
        <span className="build-badge">{t('foundation')}</span>
        <button className="language-toggle" onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')} aria-label={language === 'fa' ? 'Switch to English' : 'تغییر به فارسی'}><Icon name="globe" size={16} /><span>{language === 'fa' ? 'EN' : 'فا'}</span></button>
      </div>
    </header>

    <nav className="rail" aria-label={t('city')}>
      <button className={`rail-item ${panel === null ? 'active' : ''}`} onClick={() => { setPanel(null); camera.current?.reset(); }} aria-label={t('city')} title={t('city')}><Icon name="city" size={23} /><span>{t('city')}</span></button>
      <div className="rail-divider" />
      <button className={`rail-item ${panel === 'guide' ? 'active' : ''}`} onClick={() => setPanel('guide')} aria-label={t('guide')} title={t('guide')}><Icon name="guide" size={22} /><span>{t('guide')}</span></button>
      <button className={`rail-item rail-bottom ${panel === 'settings' ? 'active' : ''}`} onClick={() => setPanel('settings')} aria-label={t('settings')} title={t('settings')}><Icon name="settings" size={22} /><span>{t('settings')}</span></button>
      <span className="rail-version" dir="ltr">v0.1</span>
    </nav>

    <main id="capital" className="main">
      <section className="intro"><div><p className="eyebrow"><span className="gold-line" />{t('capitalSub')}</p><h1>{t('build')}</h1><p className="intro-sub">{t('welcome')}</p></div><button className="text-button" onClick={() => setPanel('guide')}>{t('guide')}<Icon name="arrow" size={18} /></button></section>

      <div className="city-layout">
        <section className="viewport" aria-label={t('live')}>
          <Suspense fallback={<div className="scene-loading">{t('loading')}</div>}>
            <CityView ref={camera} elapsedHours={world.elapsedHours} selected={selected} quality={quality} label={t('viewLabel')} onSelect={onSelect} onStats={setStats} onFailure={onFailure} onReady={onReady} />
          </Suspense>
          {!sceneReady && !renderError && <div className="scene-loading">{t('loading')}</div>}
          {renderError && <div className="scene-error" role="alert"><Icon name="city" size={36} /><p>{t('rendererError')}</p><button className="primary-button" onClick={() => location.reload()}>{t('reload')}</button></div>}
          <div className="view-top"><div className="location-tag"><Icon name="pin" size={15} /><span>{t('district')}<small>{t('districtSub')}</small></span></div><span className="view-live"><i />{t('live')}</span></div>
          <div className="compass" aria-label={t('north')}><span>{t('north')}</span><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5 26 30 20 25 14 30Z" fill="#f4eedb"/><path d="m20 5 6 25-6-5Z" fill="#b99a5c"/></svg></div>
          <div className="view-bottom"><div className="camera-hint"><span>{t('helpMove')}</span><i /> <span>{t('helpZoom')}</span></div><div className="camera-tools">
            <button aria-label={t('zoomIn')} title={t('zoomIn')} onClick={() => camera.current?.zoom(0.8)} disabled={!sceneReady || renderError}><Icon name="plus" size={18} /></button>
            <button aria-label={t('zoomOut')} title={t('zoomOut')} onClick={() => camera.current?.zoom(1.25)} disabled={!sceneReady || renderError}><Icon name="minus" size={18} /></button>
            <button aria-label={t('resetCamera')} title={t('resetCamera')} onClick={() => camera.current?.reset()} disabled={!sceneReady || renderError}><Icon name="reset" size={18} /></button>
          </div></div>
          <button className="mobile-details" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen}><Icon name="building" size={18} />{t('expand')}</button>
        </section>

        <aside className={`inspector ${detailsOpen ? 'mobile-open' : ''}`} aria-label={t('landmarks')}>
          <div className="inspector-heading"><span className="eyebrow">{building ? t('selected') : t('landmarks')}</span>{(building || detailsOpen) && <button className="icon-button" aria-label={t('close')} onClick={() => { setSelected(null); setDetailsOpen(false); }}><Icon name="close" size={16} /></button>}</div>
          {building ? <div className="building-info">
            <div className={`building-illustration ${building.kind}`}><Icon name="building" size={72} /><span className="illustration-rule" /></div>
            <span className="kind-tag">{t(building.kind)}</span><h2>{building.name[language]}</h2><p className="description">{t(`${building.kind}Desc` as MessageKey)}</p>
            <dl className="building-metrics"><div><dt>{t('height')}</dt><dd>{number(building.height)} <small>{t('meters')}</small></dd></div><div><dt>{t('footprint')}</dt><dd>{number(building.width * building.depth)} <small>{t('squareMeters')}</small></dd></div></dl>
            <button className="primary-button focus-button" onClick={() => camera.current?.focus(building.id)} disabled={!sceneReady || renderError}><Icon name="pin" size={16} />{t('focus')}</button>
            <p className="visual-note">{t('visualNote')}</p>
          </div> : <div className="inspector-welcome"><div className="small-seal"><Icon name="building" size={32} /></div><h2>{t('discover')}</h2><p>{t('selectHint')}</p></div>}
          <div className="landmark-list">{buildings.slice(0, 3).map((item, i) => <button key={item.id} className={`landmark ${selected === item.id ? 'selected' : ''}`} onClick={() => onSelect(item.id)} aria-pressed={selected === item.id}>
            <span className="landmark-number" dir="ltr">0{i + 1}</span><span>{item.name[language]}<small>{t(item.kind)}</small></span><Icon name="arrow" size={16} />
          </button>)}</div>
          <div className="phase-card"><span className="phase-dot" /><div><strong>{t('phaseNote')}</strong><p>{t('phaseDetail')}</p></div></div>
        </aside>
      </div>

      <section className="timebar" aria-label={t('date')}>
        <div className="date-block"><span className="calendar-icon"><Icon name={period === 'night' ? 'moon' : 'sun'} size={22} /></span><div><span className="eyebrow">{t('date')}</span><strong data-testid="simulation-date">{formatDate(date, language)}</strong></div></div>
        <div className="clock-block"><strong dir="ltr" data-testid="simulation-time">{formatTime(date, language)}</strong><span>{t(period)}</span></div>
        <div className="time-controls"><button className="play-button" onClick={() => command({ type: 'set-paused', paused: !world.paused })} aria-label={world.paused ? t('play') : t('pause')} disabled={!ready || error}><Icon name={world.paused ? 'play' : 'pause'} size={21} /></button>
          <div className="speed-buttons" role="group" aria-label={t('speed')}>{([1, 6, 24] as GameSpeed[]).map(speed => <button key={speed} onClick={() => command({ type: 'set-speed', speed })} aria-pressed={world.speed === speed} aria-label={`${number(speed)} ${t('hoursPerSecond')}`} className={world.speed === speed ? 'chosen' : ''} disabled={!ready || error}><bdi>{number(speed)}×</bdi></button>)}</div>
        </div>
        <div className={`clock-status ${world.paused || world.suspended ? '' : 'is-running'}`} data-testid="clock-status"><i />{t(world.suspended ? 'suspended' : world.paused ? 'paused' : 'running')}</div>
      </section>
      {error && <div className="worker-error" role="alert">{t('workerError')} <button onClick={() => location.reload()}>{t('reload')}</button></div>}
      <footer className="footer"><span>{t('phaseNote')}</span><span className="footer-performance">{stats ? `${number(stats.fps)} ${t('fps')}` : t('unavailable')}<i />WebGL2</span></footer>
    </main>

    <dialog ref={dialog} className="modal" onCancel={() => setPanel(null)} onClose={() => setPanel(null)} onClick={event => { if (event.target === dialog.current) setPanel(null); }}>
      <div className="modal-inner"><div className="modal-heading"><div><p className="eyebrow">PRESIDENT</p><h2>{panel === 'settings' ? t('settings') : t('guideTitle')}</h2></div><button className="icon-button" onClick={() => setPanel(null)} aria-label={t('close')}><Icon name="close" /></button></div>
        {panel === 'settings' ? <>
          <section className="setting-section"><h3>{t('language')}</h3><p>{t('languageDesc')}</p><div className="segmented">{(['fa', 'en'] as Language[]).map(lang => <button key={lang} aria-pressed={lang === language} onClick={() => setLanguage(lang)}>{lang === 'fa' ? 'فارسی' : 'English'}</button>)}</div></section>
          <section className="setting-section"><h3>{t('quality')}</h3><p>{t('qualityDesc')}</p><div className="segmented">{(['low', 'medium', 'high'] as Quality[]).map(value => <button key={value} aria-pressed={value === quality} onClick={() => setQuality(value)}>{t(value)}</button>)}</div></section>
          <section className="setting-section"><h3>{t('performance')}</h3><dl className="performance-grid"><div><dt>{t('fps')}</dt><dd>{stats ? number(stats.fps) : '—'}</dd></div><div><dt>{t('drawCalls')}</dt><dd>{stats ? number(stats.calls) : '—'}</dd></div><div><dt>{t('triangles')}</dt><dd>{stats ? number(stats.triangles) : '—'}</dd></div></dl></section>
        </> : <><p className="guide-intro">{t('guideIntro')}</p>{(['Camera', 'Select', 'Time', 'Limits'] as const).map((key, index) => <section className="guide-step" key={key}><span>{number(index + 1)}</span><div><h3>{t(`guide${key}`)}</h3><p>{t(`guide${key}Text`)}</p></div></section>)}</>}
      </div>
    </dialog>
  </div>;
}

