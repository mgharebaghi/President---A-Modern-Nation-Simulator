import { spawn } from 'node:child_process';
import { once } from 'node:events';

/** Own the server for one operation. Never attach to or terminate someone else's server. */
export async function withPreview(action) {
  const url = 'http://127.0.0.1:5174';
  // Vite strictPort refuses an occupied port. Its own stdout confirms readiness;
  // an existing service on that port cannot be mistaken for this child.
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174', '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let output = '';
  const stopped = once(child, 'exit');
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    try { await stopped; } finally { clearTimeout(timer); }
  };
  const interrupt = () => { void stop(); };
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Preview startup timed out: ${output}`)), 15_000);
      const read = chunk => {
        output += chunk.toString();
        if (/Local:.*127\.0\.0\.1:5174/.test(output)) { clearTimeout(timer); resolve(); }
      };
      child.stdout.on('data', read); child.stderr.on('data', read);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited (${code}): ${output}`)); });
    });
    return await action(url);
  } finally {
    await stop(); process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
  }
}
