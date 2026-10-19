/// <reference lib="webworker" />
import { TypeScriptKernel } from './kernel';
import type { EngineRequest, EngineResponse, SimulationEvent } from './types';

const worker = self as unknown as DedicatedWorkerGlobalScope;
const kernel = new TypeScriptKernel();
let last = performance.now();

function send(events: SimulationEvent[] = []) {
  worker.postMessage({ type: 'snapshot', state: kernel.snapshot(), events } satisfies EngineResponse);
}

function settle() {
  const now = performance.now();
  // A suspended or stalled tab never runs an unbounded catch-up loop.
  kernel.advance(Math.min((now - last) / 1000, 1));
  last = now;
}

worker.onmessage = ({ data }: MessageEvent<EngineRequest>) => {
  settle();
  if (data.type === 'visibility') { kernel.suspend(data.hidden); send(); return; }
  try { send(kernel.command(data.command)); }
  catch { worker.postMessage({ type: 'error', code: 'invalid-command' } satisfies EngineResponse); }
};
setInterval(() => { settle(); send(); }, 100);
send();
