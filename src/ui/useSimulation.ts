import { useCallback, useEffect, useRef, useState } from 'react';
import { initialWorld } from '../engine/kernel';
import type { EngineRequest, EngineResponse, PlayerCommand, SaveGame, SimulationEvent } from '../engine/types';
interface Pending { resolve(value: SaveGame | undefined): void; reject(error: Error): void; timer: number }
export function useSimulation() {
  const [state, setState] = useState(initialWorld);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [commandError, setCommandError] = useState(false);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const sequence = useRef(0);
  useEffect(() => {
    let worker: Worker;
    try { worker = new Worker(new URL('../engine/simulation.worker.ts', import.meta.url), { type: 'module' }); }
    catch { setError(true); return; }
    workerRef.current = worker;
    const requests = pending.current;
    const fail = () => {
      setError(true);
      for (const request of requests.values()) { clearTimeout(request.timer); request.reject(new Error('Worker stopped')); }
      requests.clear();
    };
    const timeout = window.setTimeout(fail, 10_000);
    worker.onmessage = ({ data }: MessageEvent<EngineResponse>) => {
      if (data.type === 'snapshot') {
        window.clearTimeout(timeout); setReady(true);
        setState(previous => previous.revision === data.state.revision && previous.suspended === data.state.suspended ? previous : data.state);
        if (data.events.length) setEvents(previous => [...previous, ...data.events].slice(-100));
      } else if ('id' in data && data.id !== undefined) {
        const request = requests.get(data.id);
        if (request) {
          clearTimeout(request.timer); requests.delete(data.id);
          if (data.type === 'error') request.reject(new Error(data.code));
          else request.resolve(data.type === 'saved' ? data.save : undefined);
        }
      } else if (data.type === 'error') setCommandError(true);
    };
    worker.onerror = fail; worker.onmessageerror = fail;
    const visibility = () => worker.postMessage({ type: 'visibility', hidden: document.hidden } satisfies EngineRequest);
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => {
      window.clearTimeout(timeout); document.removeEventListener('visibilitychange', visibility); worker.terminate(); workerRef.current = null;
      for (const request of requests.values()) { clearTimeout(request.timer); request.reject(new Error('Worker closed')); }
      requests.clear();
    };
  }, []);
  const command = useCallback((command: PlayerCommand) => {
    setCommandError(false); workerRef.current?.postMessage({ type: 'command', command } satisfies EngineRequest);
  }, []);
  const request = useCallback((type: 'save' | 'load', save?: SaveGame) => new Promise<SaveGame | undefined>((resolve, reject) => {
    if (!workerRef.current) { reject(new Error('Worker unavailable')); return; }
    const id = ++sequence.current;
    const timer = window.setTimeout(() => { pending.current.delete(id); reject(new Error('Worker timeout')); }, 10_000);
    pending.current.set(id, { resolve, reject, timer });
    workerRef.current.postMessage(type === 'save' ? { type, id } : { type, id, save });
  }), []);
  return { state, events, command, ready, error, commandError, request };
}
