import React, { useState } from 'react';
import { AuctionRules, CurrencyType } from '../types';
import { Settings, Shield, Sliders, RotateCcw, Save, Check } from 'lucide-react';

interface RulesSettingsViewProps {
  rules: AuctionRules;
  onUpdateRules: (newRules: AuctionRules) => void;
  onResetAuction: () => void;
}

export const RulesSettingsView: React.FC<RulesSettingsViewProps> = ({
  rules,
  onUpdateRules,
  onResetAuction,
}) => {
  const [purse, setPurse] = useState(rules.pursePerTeam);
  const [minPlayers, setMinPlayers] = useState(rules.minPlayersPerTeam);
  const [maxPlayers, setMaxPlayers] = useState(rules.maxPlayersPerTeam);
  const [currency, setCurrency] = useState<CurrencyType>(rules.currency);
  const [timerSeconds, setTimerSeconds] = useState(rules.timerSeconds);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRules({
      ...rules,
      pursePerTeam: Number(purse),
      minPlayersPerTeam: Number(minPlayers),
      maxPlayersPerTeam: Number(maxPlayers),
      currency,
      timerSeconds: Number(timerSeconds),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="p-6 rounded-3xl glass-panel border border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white font-display flex items-center gap-2">
            ⚙️ AUCTION RULES & SETTINGS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure purse budget, team size constraints, currency, and bid increments.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-8 rounded-3xl glass-panel border border-white/10 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-gold-400" />
              Total Purse Budget per Team
            </label>
            <input
              type="number"
              step="50000"
              value={purse}
              onChange={(e) => setPurse(Number(e.target.value))}
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-4 py-2.5 text-base font-bold text-white focus:border-gold-400 focus:outline-none font-mono"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">Default: ₹10,00,000 (10 Lakhs)</span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-electric-cyan" />
              Currency Format
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyType)}
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-gold-400 focus:outline-none"
            >
              <option value="INR">₹ Indian Rupee (INR)</option>
              <option value="POINTS">Points / Coins (Box Cricket)</option>
              <option value="LAKHS">Lakhs / Crores (IPL Broadcast)</option>
              <option value="USD">$ US Dollars</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-white/10">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Min Players / Team</label>
            <input
              type="number"
              value={minPlayers}
              onChange={(e) => setMinPlayers(Number(e.target.value))}
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Max Squad Limit</label>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Timer (Seconds)</label>
            <input
              type="number"
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value))}
              className="w-full bg-obsidian-950 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white"
            />
          </div>
        </div>

        {/* Bid Slabs Guide */}
        <div className="p-4 rounded-2xl bg-obsidian-950/60 border border-white/5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gold-400 block">
            Automatic Bid Increment Slabs
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
            <div className="p-2 bg-white/[0.02] rounded-lg">Up to ₹50k: <strong className="text-white">+₹2,000</strong></div>
            <div className="p-2 bg-white/[0.02] rounded-lg">₹50k to ₹2L: <strong className="text-white">+₹5,000</strong></div>
            <div className="p-2 bg-white/[0.02] rounded-lg">₹2L to ₹5L: <strong className="text-white">+₹10,000</strong></div>
            <div className="p-2 bg-white/[0.02] rounded-lg">₹5L+: <strong className="text-white">+₹25,000</strong></div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to reset all auction results and restore initial purse balances?')) {
                onResetAuction();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Auction Progress
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold active:scale-95 transition-all"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Rules Saved!' : 'Save Rule Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
