const RECOVERY_KEY = 'cap_chunk_recovery_at';
const RECOVERY_COOLDOWN = 60_000;

// A deployment can replace a lazy module while an older tab is still open.
// Reload once to acquire the current entry point; never create a reload loop.
export function shouldRecoverChunk(error, storage, now = Date.now()) {
  const message = String(error?.message || error || '');
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .+ failed/i.test(message)) return false;
  try {
    const previous = storage.getItem(RECOVERY_KEY);
    if (previous && now - Number(previous) < RECOVERY_COOLDOWN) return false;
    storage.setItem(RECOVERY_KEY, String(now));
    return true;
  } catch { return false; }
}
