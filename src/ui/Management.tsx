import { useEffect, useState } from 'react';
import { ECONOMY, energyCapacity, MAX_HOURS, POWER, powerProgress } from '../engine/kernel';
import { simulationDate } from '../engine/calendar';
import { readSlot, writeSlot, type SaveSlot } from '../engine/storage';
import type { Account, PlayerCommand, SaveGame, WorldState } from '../engine/types';
import { formatDate, formatNumber, formatTime } from '../i18n/format';
import { translator, type Language, type MessageKey } from '../i18n/messages';
interface Props {
  world: WorldState; language: Language; disabled: boolean; canFocus: boolean; commandError: boolean;
  command(command: PlayerCommand): void;
  request(type: 'save' | 'load', save?: SaveGame): Promise<SaveGame | undefined>;
  focus(): void;
}
const accountKeys: Record<Account, MessageKey> = { treasury: 'accountTreasury', private: 'accountPrivate', contractor: 'accountContractor', services: 'accountServices', utility: 'accountUtility' };
export function Management({ world, language, disabled, canFocus, commandError, command, request, focus }: Props) {
  const t = translator(language), n = (value: number) => formatNumber(value, language);
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<SaveSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    readSlot().then(value => { if (!cancelled) setSlot(value); }).catch(() => { if (!cancelled) setNotice('storageUnavailable'); })
      .finally(() => { if (!cancelled) setStorageReady(true); });
    return () => { cancelled = true; };
  }, []);
  async function persist(load: boolean) {
    setBusy(true); setNotice(null);
    try {
      if (load) {
        const fresh = await readSlot(); if (!fresh) throw new Error('Missing slot');
        await request('load', fresh.game); setSlot(fresh); setNotice('restored');
      } else {
        const save = await request('save'); if (!save) throw new Error('Missing snapshot');
        setSlot(await writeSlot(save)); setNotice('saved');
      }
    } catch { setNotice('storageError'); }
    finally { setBusy(false); }
  }
  const progress = powerProgress(world);
  const projectStatus = world.power.startedAt === null ? 'projectReady' : world.power.completedAt === null ? 'projectBuilding' : 'projectComplete';
  const capacity = energyCapacity(world), reserve = capacity - POWER.demand;
  const savedDate = slot ? simulationDate(slot.game.world.elapsedHours) : null;
  return <section className="management" aria-label={t('management')}>
    <div className="resource-strip">
      <div><span>{t('treasury')}</span><strong data-testid="treasury">{n(world.finance.accounts.treasury)} <small>{t('credits')}</small></strong></div>
      <div><span>{t('energy')}</span><strong data-testid="energy">{n(capacity)} / {n(POWER.demand)} <small>{t('mw')}</small></strong><small className={reserve < 0 ? 'deficit' : 'positive'}>{t(reserve < 0 ? 'shortfall' : 'surplus')} · {n(Math.abs(reserve))} {t('mw')}</small></div>
      <div><span>{t('powerPlant')}</span><strong data-testid="project-status">{t(projectStatus)} {world.power.startedAt !== null && <small>{n(Math.floor(progress * 100))}%</small>}</strong><progress aria-label={t('powerPlant')} value={progress} max={1} /></div>
      <button className="primary-button" aria-expanded={open} aria-controls="management-details" onClick={() => setOpen(!open)}>{t(open ? 'hideManagement' : 'showManagement')}</button>
    </div>
    {open && <div id="management-details" className="management-details">
      <div className="management-grid"><section><h2>{t('powerPlant')}</h2><p>{t('projectHint')}</p>
        <dl className="finance-values">
          <div><dt>{t('powerCost')}</dt><dd>{n(POWER.cost)} {t('credits')}</dd></div>
          <div><dt>{t('powerDuration')}</dt><dd>{n(POWER.hours)} {t('hours')}</dd></div>
          <div><dt>{t('powerOutput')}</dt><dd>{n(POWER.capacity)} {t('mw')}</dd></div>
          <div><dt>{t('powerUpkeep')}</dt><dd>{n(ECONOMY.maintenance)} {t('credits')}</dd></div>
          {world.power.startedAt !== null && <div><dt>{t('remaining')}</dt><dd data-testid="remaining">{n(Math.max(0, POWER.hours - (world.elapsedHours - world.power.startedAt)))} {t('hours')}</dd></div>}
        </dl>
        <div className="management-actions"><button className="primary-button" disabled={disabled || busy || world.power.startedAt !== null || world.finance.accounts.treasury < POWER.cost || world.elapsedHours + POWER.hours > MAX_HOURS} onClick={() => command({ type: 'build-power' })}>{t('buildPower')}</button><button className="primary-button" disabled={!canFocus} onClick={focus}>{t('focusProject')}</button></div>
        {world.finance.accounts.treasury < POWER.cost && world.power.startedAt === null && <p className="deficit">{t('insufficient')}</p>}
        <p>{t('energyNote')}</p>
      </section><section><h2>{t('treasury')}</h2>
        <dl className="finance-values">{([['dailyTax', ECONOMY.tax], ['dailyServices', ECONOMY.services], ['income', world.finance.income], ['expenditure', world.finance.expenditure], ['unpaid', world.finance.unpaid]] as const).map(([key, value]) => <div key={key}><dt>{t(key)}</dt><dd>{n(value)} {t('credits')}</dd></div>)}</dl>
        <p>{t('economyNote')}</p><details><summary>{t('accounts')}</summary><dl className="finance-values">{(Object.keys(accountKeys) as Account[]).map(account => <div key={account}><dt>{t(accountKeys[account])}</dt><dd>{n(world.finance.accounts[account])}</dd></div>)}</dl><p>{t('cashBalance')}</p></details>
      </section></div>
      <section className="save-section"><h2>{t('saveGame')}</h2><p>{t('saveNote')}</p>
        <div className="management-actions"><button className="primary-button" disabled={disabled || busy || !storageReady} onClick={() => void persist(false)}>{t('saveGame')}</button><button className="primary-button" disabled={disabled || busy || !slot} onClick={() => void persist(true)}>{t('loadGame')}</button></div>
        <p>{savedDate ? `${t('saveAt')}: ${formatDate(savedDate, language)} · ${formatTime(savedDate, language)}` : t('noSave')}</p>
        <p role="status">{busy ? t('busy') : notice ? t(notice) : ''}</p>
      </section>
      <details className="ledger"><summary>{t('ledger')}</summary>{world.finance.ledger.length ? <ol>{world.finance.ledger.slice().reverse().map((entry, i) => <li key={`${entry.hour}-${entry.kind}-${i}`}><span>{formatDate(simulationDate(entry.hour), language)} · {formatTime(simulationDate(entry.hour), language)}</span><strong>{t(entry.kind)} · {n(entry.amount)} {t('credits')}</strong><small>{t(accountKeys[entry.from])} → {t(accountKeys[entry.to])}</small></li>)}</ol> : <p>{t('noTransfers')}</p>}</details>
      <p>{t('horizon')}</p>
    </div>}
    {commandError && <p role="alert">{t('commandError')}</p>}
  </section>;
}
