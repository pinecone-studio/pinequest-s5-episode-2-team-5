/**
 * Plays every textbook experiment (7-01 … 10-44) in the real lab, one after another, in headless
 * Chromium: start it from the menu, sit at the worktop, then run its full guided demonstration or
 * carry out the book's procedure (scripts/playthrough/page.ts). Needs the dev server:
 *   npx vite --port 5181 --strictPort --host 127.0.0.1
 *   node scripts/playthrough.mjs                 # all 145
 *   PLAY=7-18,10-23 node scripts/playthrough.mjs
 * PLAY_WORKERS splits the list over that many browsers (default 4). PLAY_WARP runs each page's
 * clock that many times faster (default 4): every frame, physics substep and timer still runs,
 * only sooner. GPU drawing is skipped unless PLAY_RENDER is set (software WebGL draws ~1 frame/s).
 * Writes one JSON line per experiment to PLAY_OUT (default playthrough-results.jsonl).
 */
import { spawn } from 'node:child_process';
import { access, appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const url = process.env.PLAY_URL ?? 'http://127.0.0.1:5181/';
const out = process.env.PLAY_OUT ?? 'playthrough-results.jsonl';
const only = process.env.PLAY?.split(',').map((s) => s.trim()).filter(Boolean);
const workers = Math.max(1, Number(process.env.PLAY_WORKERS ?? 4));
const warp = Math.max(1, Number(process.env.PLAY_WARP ?? 4));
const candidates = [process.env.CHROME_PATH, '/var/cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
let executable;
for (const path of candidates) { try { await access(path); executable = path; break; } catch { /* next */ } }
if (!executable) throw Error('Chrome/Chromium is required; set CHROME_PATH.');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One browser with the lab loaded; `play(id)` runs one experiment and returns its status. */
async function openLab(name) {
  const profile = await mkdtemp(resolve(tmpdir(), 'openlab-play-'));
  const browser = spawn(executable, ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((ok, no) => {
    let text = '';
    const timer = setTimeout(() => no(Error('Chrome did not start')), 30000);
    browser.stderr.on('data', (d) => { text += d; const hit = text.match(/DevTools listening on (ws:\/\/\S+)/); if (hit) { clearTimeout(timer); ok(hit[1]); } });
    browser.once('exit', (code) => no(Error(`Chrome exited (${code})`)));
  });
  const socket = new WebSocket(endpoint);
  await new Promise((ok, no) => { socket.addEventListener('open', ok, { once: true }); socket.addEventListener('error', no, { once: true }); });
  let counter = 0;
  const pending = new Map(), exceptions = [], consoleErrors = [];
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) { const p = pending.get(msg.id); if (p) { pending.delete(msg.id); msg.error ? p.no(Error(msg.error.message)) : p.ok(msg.result); } return; }
    if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 400));
  });
  const send = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++counter; pending.set(id, { ok, no }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async (expression, awaitPromise = false) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async (expression, label, ms = 300000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await evaluate(`Boolean(${expression})`).catch(() => false)) return; await sleep(500); }
    throw Error(`${name}: timed out: ${label}`);
  };
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1024, height: 700, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('openlab3d-settings',JSON.stringify({state:{quality:'low',reducedMotion:true},version:1}));
    (()=>{const k=${warp};if(k===1)return;const real=performance.now.bind(performance),t0=real();performance.now=()=>t0+(real()-t0)*k;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=(cb)=>raf((ts)=>cb(t0+(ts-t0)*k));})();` });
  await call('Page.navigate', { url });
  await waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Лабораторид орох')", 'entry screen');
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Лабораторид орох').click()");
  await waitFor("document.querySelector('canvas') && window.__lab", 'lab loaded');
  await sleep(3000);
  await evaluate("import('/scripts/playthrough/page.ts').then(m=>{window.__play=m;return true})", true);
  if (!process.env.PLAY_RENDER) await evaluate('window.__play.drawFrames(false)');
  return {
    ids: () => evaluate('window.__play.ids()'),
    async play(id) {
      exceptions.length = 0; consoleErrors.length = 0;
      await evaluate(`window.__play.play(${JSON.stringify(id)})`);
      let status;
      const end = Date.now() + 20 * 60000;
      while (Date.now() < end) { await sleep(1000); status = await evaluate('window.__play.current()'); if (status && status.state !== 'running') break; }
      if (status?.state === 'running') status = { ...status, state: 'fail', failures: [...status.failures, `timed out at ${status.stage}`] };
      if (exceptions.length) status = { ...status, state: 'fail', failures: [...status.failures, ...[...new Set(exceptions.map((e) => `JS: ${e.split('\n').slice(0, 9).join(' ⟵ ')}`))].slice(0, 3)] };
      status.consoleErrors = [...new Set(consoleErrors)].slice(0, 5);
      return status;
    },
    async close() { socket.close(); browser.kill(); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); },
  };
}

const first = await openLab('worker 1');
const ids = only ?? await first.ids();
await writeFile(out, '');
const queue = [...ids], results = new Map();
let done = 0;
const t0 = Date.now();
async function worker(lab) {
  try {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const status = await lab.play(id);
      results.set(id, status);
      await appendFile(out, JSON.stringify(status) + '\n');
      console.log(`${String(++done).padStart(3)}/${ids.length} ${status.state === 'pass' ? 'PASS' : 'FAIL'} ${id} [${status.kind}] ${status.seconds.toFixed(0)}s ${status.title}`);
      for (const f of status.failures) console.log(`      ✗ ${f}`);
      if (status.state === 'pass' && status.messages.length) console.log(`      · ${status.messages.slice(0, 2).join(' | ')}`);
      if (status.consoleErrors.length) console.log(`      console: ${status.consoleErrors[0]}`);
    }
  } finally { await lab.close(); }
}
const labs = [first, ...(await Promise.all(Array.from({ length: Math.min(workers, ids.length) - 1 }, (_, i) => openLab(`worker ${i + 2}`))))];
await Promise.all(labs.map(worker));
const ordered = ids.map((id) => results.get(id)).filter(Boolean);
const failed = ordered.filter((r) => r.state !== 'pass');
console.log(`\n${ordered.length - failed.length}/${ids.length} experiments done and verified in ${((Date.now() - t0) / 60000).toFixed(1)} min${failed.length ? `; failed: ${failed.map((r) => r.id).join(', ')}` : ''}`);
process.exitCode = failed.length || ordered.length < ids.length ? 1 : 0;
