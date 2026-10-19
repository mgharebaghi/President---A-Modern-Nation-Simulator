import type { PowerProject } from '../engine/types';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CapitalRenderer, type Quality, type RenderStats } from '../render/city';

export interface CameraActions { reset(): void; zoom(factor: number): void; focus(id: string): void; focusProject(): void }
interface Props {
  elapsedHours: number; project: PowerProject; selected: string | null; quality: Quality; label: string;
  onSelect(id: string): void; onStats(stats: RenderStats): void; onFailure(): void; onReady(): void;
}

const CityView = forwardRef<CameraActions, Props>(function CityView({ elapsedHours, project, selected, quality, label, onSelect, onStats, onFailure, onReady }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<CapitalRenderer | null>(null);
  useEffect(() => {
    try {
      renderer.current = new CapitalRenderer(host.current!, onSelect, onStats, onFailure, host.current!.parentElement?.querySelector('.compass svg') ?? null);
      onReady();
    } catch { onFailure(); }
    return () => { renderer.current?.dispose(); renderer.current = null; };
  }, [onSelect, onStats, onFailure, onReady]);
  useEffect(() => { renderer.current?.updateTime(elapsedHours); renderer.current?.updateProject(project, elapsedHours); }, [elapsedHours, project]);
  useEffect(() => { renderer.current?.select(selected); }, [selected]);
  useEffect(() => { renderer.current?.setQuality(quality); }, [quality]);
  useEffect(() => {
    // Exposed only to the local automated browser checks, never in production.
    if (import.meta.env.DEV) {
      Object.defineProperty(window, '__presidentRender', { configurable: true, get: () => renderer.current?.diagnostics() });
      return () => { Reflect.deleteProperty(window, '__presidentRender'); };
    }
  }, []);
  useImperativeHandle(ref, () => ({
    reset: () => renderer.current?.reset(), zoom: factor => renderer.current?.zoom(factor), focus: id => renderer.current?.focus(id), focusProject: () => renderer.current?.focusProject(),
  }), []);
  useEffect(() => { host.current?.querySelector('canvas')?.setAttribute('aria-label', label); }, [label]);
  return <div className="city-canvas" ref={host} role="region" aria-label={label} data-testid="city-view" />;
});
export default CityView;
