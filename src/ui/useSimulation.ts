import { useCallback, useEffect, useState } from 'react';
import { initialWorld } from '../engine/kernel';
import type { EngineRequest, EngineResponse, PlayerCommand, SimulationEvent } from '../engine/types';
import { useRef } from 'react';

export function useSimulation() {
  const [state, setState] = useState(initialWorld);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
    let worker: Worker;
    try { worker = new Worker(new URL('../engine/simulation.worker.ts', import.meta.url), { type: 'module' }); }
    catch { setError(true); return; }
    workerRef.current = worker;
    const timeout = window.setTimeout(() => setError(true), 10_000);
    worker.onmessage = ({ data }: MessageEvent<EngineResponse>) => {
      window.clearTimeout(timeout);
      if (data.type === 'snapshot') {
        setReady(true);
        setState(previous => previous.revision === data.state.revision && previous.suspended === data.state.suspended ? previous : data.state);
        if (data.events.length) setEvents(previous => [...previous, ...data.events].slice(-100));
      } else setError(true);
    };
    worker.onerror = () => setError(true);
    worker.onmessageerror = () => setError(true);
    const visibility = () => worker.postMessage({ type: 'visibility', hidden: document.hidden } satisfies EngineRequest);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => { window.clearTimeout(timeout); document.removeEventListener('visibilitychange', visibility); worker.terminate(); workerRef.current = null; };
  }, []);
  const command = useCallback((command: PlayerCommand) => {
    workerRef.current?.postMessage({ type: 'command', command } satisfies EngineRequest);
  }, []);
  return { state, events, command, ready, error };
}
