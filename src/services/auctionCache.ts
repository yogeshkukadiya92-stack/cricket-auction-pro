// Keep roster and live snapshots scoped to the signed-in organizer and tab.
export function cacheSnapshot(key: string, data: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { /* The in-memory roster remains available. */ }
}

export async function loadSnapshot<T>(key: string, fetchData: () => Promise<T>): Promise<T> {
  try {
    const data = await fetchData();
    cacheSnapshot(key, data);
    return data;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status && status < 500) throw error;
    const cached = sessionStorage.getItem(key);
    if (!cached) throw error;
    return JSON.parse(cached);
  }
}
