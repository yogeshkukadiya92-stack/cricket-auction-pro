/** Bound headers and body reads; cancelled or timed-out writes must remain pending. */
export async function requestJson(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abort = () => controller.abort(externalSignal.reason);
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const { onEtag, ...fetchOptions } = options;
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    if (response.status === 304) return null;
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || `Request failed (${response.status}). Please retry.`), { status: response.status });
    if (response.headers.get('etag')) onEtag?.(response.headers.get('etag'));
    return data;
  } catch (error) {
    if (timedOut) throw new Error('The server is taking too long. Check your connection and retry.');
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abort);
  }
}

/** Instantiate within a scoped effect: validators are never shared between accounts or pages. */
export function createJsonPoller() {
  let etag = '';
  return (url, options = {}, timeoutMs = 10000) => requestJson(url, {
    ...options,
    headers: { ...options.headers, ...(etag ? { 'If-None-Match': etag } : {}) },
    onEtag: value => { etag = value; },
  }, timeoutMs);
}
