/**
 * Star's line to the AI: the lab cannot call it itself, so it asks the ChemQuest app around it
 * (a parent page on the web, the React Native WebView on phones), which answers with
 * 'chemquest:pip-answer' and the same id. Without a host, or when it does not answer in time,
 * the answer is null and Star uses its own words.
 */
const pending = new Map<string, (answer: string | null) => void>();
let listening = false;

function listen(): void {
  if (listening) return;
  listening = true;
  const standalone = window.parent === window;
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (event.origin !== window.location.origin || event.source !== (standalone ? window : window.parent) || !event.data || typeof event.data !== 'object') return;
    const data = event.data as { type?: unknown; version?: unknown; id?: unknown; answer?: unknown };
    if (data.type !== 'chemquest:pip-answer' || data.version !== 1 || typeof data.id !== 'string') return;
    const resolve = pending.get(data.id);
    if (!resolve) return;
    pending.delete(data.id);
    resolve(typeof data.answer === 'string' ? data.answer : null);
  });
}

function post(message: Record<string, unknown>): void {
  if (window.parent === window) {
    (window as Window & { ReactNativeWebView?: { postMessage: (value: string) => void } }).ReactNativeWebView?.postMessage(JSON.stringify(message));
  } else window.parent.postMessage(message, window.location.origin);
}

/** Sends one request to the host and waits for its answer, or null after timeoutMs. */
export async function askHost(message: Record<string, unknown> & { type: string }, timeoutMs: number): Promise<string | null> {
  listen();
  const id = crypto.randomUUID();
  const answer = new Promise<string | null>((resolve) => {
    pending.set(id, resolve);
    post({ ...message, version: 1, id });
  });
  const result = await Promise.race([answer, new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs))]);
  pending.delete(id);
  return result;
}
