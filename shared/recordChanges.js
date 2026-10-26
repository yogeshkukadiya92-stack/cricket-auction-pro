const identity = record => `${record.tournamentId || ''}\u0000${record.id}`;

/** Upserts are merged by scoped identity so rapid edits and retry recovery never drop records. */
export function mergePending(previous = {}, incoming = {}) {
  const normalize = payload => {
    const result = { ...payload };
    for (const [collection, single] of [['players', 'player'], ['teams', 'team'], ['tournaments', 'tournament']]) {
      if (!result[single]) continue;
      const records = new Map((result[collection] || []).map(record => [identity(record), record]));
      records.set(identity(result[single]), result[single]);
      result[collection] = [...records.values()];
      delete result[single];
    }
    return result;
  };
  const older = normalize(previous), newer = normalize(incoming);
  const next = { ...older, ...newer };
  for (const collection of ['players', 'teams', 'tournaments']) {
    if (!Array.isArray(older[collection]) || !Array.isArray(newer[collection])) continue;
    const records = new Map(older[collection].map(record => [identity(record), record]));
    newer[collection].forEach(record => records.set(identity(record), record));
    next[collection] = [...records.values()];
  }
  return next;
}

export function changedRecords(previousJson, next) {
  let previous = [];
  try { previous = JSON.parse(previousJson || '[]'); } catch { /* First save sends current records. */ }
  const records = new Map(previous.map(record => [identity(record), JSON.stringify(record)]));
  return next.filter(record => records.get(identity(record)) !== JSON.stringify(record));
}
