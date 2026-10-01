import React, { useEffect, useState } from 'react';
import { formatAuctionPrice } from '../utils/currency';
export function PlayerAuctionHistory({ tournamentId, playerId }: { tournamentId?: string; playerId?: string }) {
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => {
    setHistory([]); if (!tournamentId || !playerId) return;
    const controller = new AbortController();
    fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/players/${encodeURIComponent(playerId)}/history`, {signal:controller.signal, cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d&&!controller.signal.aborted)setHistory(d.history||[]);}).catch(()=>{});
    return ()=>controller.abort();
  }, [tournamentId,playerId]);
  if (!history.length) return null;
  return <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"><p className="text-xs font-bold text-amber-300 mb-2">Previous tournament sales</p>{history.map((h,i)=><p key={i} className="text-xs text-slate-300 mb-1">{h.tournament} · {h.season} — <strong className="text-amber-300">{formatAuctionPrice(h.price,h.currency)}</strong>{h.team&&` · ${h.team}`}</p>)}</div>;
}
