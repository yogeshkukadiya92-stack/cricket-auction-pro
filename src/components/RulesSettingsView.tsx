import React, { useState } from 'react';
import { Check, RotateCcw, Save } from 'lucide-react';
import { AuctionRules, CurrencyType } from '../types';
import { ask, Hint, notify, PageHead } from '../ui/kit';

interface RulesSettingsViewProps {
  rules: AuctionRules;
  defaultBidIncrement?: number;
  onUpdateRules: (newRules: AuctionRules) => void;
  onResetAuction: () => void;
}

const currencies: { value: CurrencyType; label: string }[] = [
  { value: 'INR', label: '₹ Rupee' }, { value: 'LAKHS', label: '₹ Lakh' }, { value: 'POINTS', label: 'Points' }, { value: 'USD', label: '$ Dollar' },
];

export const RulesSettingsView: React.FC<RulesSettingsViewProps> = ({ rules, onUpdateRules, defaultBidIncrement = 20000, onResetAuction }) => {
  const [purse, setPurse] = useState(rules.pursePerTeam);
  const [minPlayers, setMinPlayers] = useState(rules.minPlayersPerTeam);
  const [maxPlayers, setMaxPlayers] = useState(rules.maxPlayersPerTeam);
  const [currency, setCurrency] = useState<CurrencyType>(rules.currency);
  const [timerSeconds, setTimerSeconds] = useState(rules.timerSeconds);
  const [bidIncrement, setBidIncrement] = useState(rules.bidIncrement || defaultBidIncrement);
  const [minimumPlayerReserve, setMinimumPlayerReserve] = useState(rules.minimumPlayerReserve || defaultBidIncrement);
  const [saved, setSaved] = useState(false);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (minPlayers < 1 || maxPlayers < minPlayers) { notify('Maximum squad must be at least the minimum.', 'warn'); return; }
    if (purse <= 0 || timerSeconds < 1 || bidIncrement <= 0 || !Number.isSafeInteger(minimumPlayerReserve) || minimumPlayerReserve <= 0) { notify('All amounts must be above zero.', 'warn'); return; }
    onUpdateRules({ ...rules, bidIncrement, minimumPlayerReserve, pursePerTeam: purse, minPlayersPerTeam: minPlayers, maxPlayersPerTeam: maxPlayers, currency, timerSeconds });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const number = (label: string, value: number, set: (value: number) => void, hint?: string) => <label className="block">
    <span className="field-label flex items-center gap-1">{label}{hint && <Hint text={hint} />}</span>
    <input type="number" min="1" required value={value} onChange={(e) => set(Number(e.target.value))} className="field font-bold" />
  </label>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHead title="Rules" />
      <form onSubmit={handleSave} className="panel p-5 sm:p-6 space-y-5">
        <div>
          <span className="field-label">Currency</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {currencies.map((item) => <button key={item.value} type="button" onClick={() => setCurrency(item.value)} aria-pressed={currency === item.value} className={`btn ${currency === item.value ? 'bg-white text-black' : 'btn-ghost'}`}>{item.label}</button>)}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {number('Purse per team', purse, setPurse)}
          {number('Bid goes up by', bidIncrement, setBidIncrement, "Added on every bid. The first bid is the player's base price.")}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {number('Min squad', minPlayers, setMinPlayers)}
          {number('Max squad', maxPlayers, setMaxPlayers)}
          {number('Timer (sec)', timerSeconds, setTimerSeconds)}
        </div>
        {number('Keep per empty squad slot', minimumPlayerReserve, setMinimumPlayerReserve, 'Money a team must keep for each player it still needs to reach the minimum squad. Maximum bid = purse left minus this amount.')}
        <button type="submit" className="btn btn-primary w-full min-h-12 text-base">{saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}{saved ? 'Saved' : 'Save rules'}</button>
      </form>
      <button
        type="button"
        onClick={async () => { if (await ask({ title: 'Reset the whole auction?', body: 'All sales are removed and team purses go back to full. This cannot be undone.', confirmLabel: 'Reset', danger: true })) onResetAuction(); }}
        className="btn bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500/20"
      ><RotateCcw className="w-4 h-4" />Reset auction</button>
    </div>
  );
};
