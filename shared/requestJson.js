/** Bound both response headers and body reads; aborted writes must remain pending. */
export async function requestJson(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}). Please retry.`);
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The server is taking too long. Check your connection and retry.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
