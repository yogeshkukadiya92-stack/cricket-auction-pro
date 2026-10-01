import { parseCsvRows } from '../utils/csvHelper';
import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Player, PlayerRole, PlayerCategory } from '../types';

interface BulkPlayerUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId?: string;
  defaultBasePrice?: number;
  onBulkAddPlayers: (players: Player[]) => void;
}

export const BulkPlayerUploadModal: React.FC<BulkPlayerUploadModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  defaultBasePrice = 20000,
  onBulkAddPlayers,
}) => {
  const [parsedPlayers, setParsedPlayers] = useState<Player[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'Name,Role,BasePrice,Category,Mobile,Email,City,BattingStyle,BowlingStyle,Matches,Runs,Wickets\n' +
      'Virat Sharma,BATSMAN,50000,MARQUEE,9876543210,virat@ipl.com,Mumbai,Right Hand Bat,Right Arm Off Spin,45,1850,4\n' +
      'Jasprit Khan,BOWLER,50000,SET_A,9876543211,jasprit@ipl.com,Ahmedabad,Right Hand Bat,Right Arm Fast,38,120,62\n' +
      'Hardik Pandya,ALL_ROUNDER,40000,MARQUEE,9876543212,hardik@ipl.com,Surat,Right Hand Bat,Right Arm Medium Fast,52,1420,38\n' +
      'Rishabh Pant,WICKET_KEEPER,40000,SET_A,9876543213,rishabh@ipl.com,Delhi,Left Hand Bat,None,40,1310,0\n' +
      'Shubman Gill,BATSMAN,30000,SET_B,9876543214,shubman@ipl.com,Punjab,Right Hand Bat,None,30,1150,0\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cricket_players_bulk_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse CSV File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setIsSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = parseCsvRows(text);
        if (lines.length < 2) {
          throw new Error('CSV file is empty or missing headers.');
        }

        const headers = lines[0].map((h) => h.trim().toLowerCase());
        const nameIdx = headers.findIndex((h) => h.includes('name'));
        if (nameIdx === -1) {
          throw new Error('CSV file must have a "Name" column.');
        }

        const roleIdx = headers.findIndex((h) => h.includes('role'));
        const priceIdx = headers.findIndex((h) => h.includes('price') || h.includes('base'));
        const catIdx = headers.findIndex((h) => h.includes('cat'));
        const mobileIdx = headers.findIndex((h) => h.includes('mobile') || h.includes('phone'));
        const emailIdx = headers.findIndex((h) => h.includes('email'));
        const cityIdx = headers.findIndex((h) => h.includes('city'));
        const batIdx = headers.findIndex((h) => h.includes('bat'));
        const bowlIdx = headers.findIndex((h) => h.includes('bowl'));
        const matchesIdx = headers.findIndex((h) => h.includes('match'));
        const runsIdx = headers.findIndex((h) => h.includes('run'));
        const photoIdx = headers.findIndex(h => h.includes('photo') || h.includes('image'));
        const strikeIdx = headers.findIndex(h => h.includes('strike'));
        const wktsIdx = headers.findIndex((h) => h.includes('wkt') || h.includes('wicket'));

        const now = Date.now();
        const playersList: Player[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].map((c) => c.trim());
          if (!row[nameIdx]) continue;

          // Map Role safely
          let rawRole = roleIdx !== -1 ? row[roleIdx]?.toUpperCase() || '' : '';
          let role: PlayerRole = 'ALL_ROUNDER';
          if (rawRole.includes('BAT')) role = 'BATSMAN';
          else if (rawRole.includes('BOWL')) role = 'BOWLER';
          else if (rawRole.includes('KEEP') || rawRole.includes('WK')) role = 'WICKET_KEEPER';

          // Base Price
          let basePrice = defaultBasePrice;
          if (priceIdx !== -1 && row[priceIdx]) {
            const parsedPrice = Number(row[priceIdx].replace(/[^0-9]/g, ''));
            if (!isNaN(parsedPrice) && parsedPrice > 0) basePrice = parsedPrice;
          }

          // Category
          let category: PlayerCategory = 'SET_A';
          if (catIdx !== -1 && row[catIdx]) {
            const rawCat = row[catIdx].toUpperCase();
            if (rawCat.includes('MARQUEE')) category = 'MARQUEE';
            else if (rawCat.includes('B')) category = 'SET_B';
            else if (rawCat.includes('ACCEL')) category = 'ACCELERATED';
          }

          const newPlayer: Player = {
            id: `ply-${now}-${i}`,
            tournamentId: tournamentId,
            name: row[nameIdx],
            photoUrl: photoIdx !== -1 && row[photoIdx] ? row[photoIdx] : '/player-placeholder.svg',
            mobile: mobileIdx !== -1 ? row[mobileIdx] : '',
            email: emailIdx !== -1 ? row[emailIdx] : '',
            city: cityIdx !== -1 ? row[cityIdx] : '',
            role,
            battingStyle: batIdx !== -1 && row[batIdx] ? row[batIdx] : 'Right Hand Bat',
            bowlingStyle: bowlIdx !== -1 && row[bowlIdx] ? row[bowlIdx] : 'Right Arm Medium',
            basePrice,
            category,
            stats: {
              matches: matchesIdx !== -1 ? Number(row[matchesIdx]) || 0 : 0,
              runs: runsIdx !== -1 ? Number(row[runsIdx]) || 0 : 0,
              wickets: wktsIdx !== -1 ? Number(row[wktsIdx]) || 0 : 0,
              strikeRate: strikeIdx !== -1 ? Number(row[strikeIdx]) || 0 : 0,
            },
            status: 'AVAILABLE',
            approvalStatus: 'APPROVED',
            lotOrder: i,
            registeredAt: new Date().toISOString(),
          };

          playersList.push(newPlayer);
        }

        if (playersList.length === 0) {
          throw new Error('No valid player rows found in CSV file.');
        }

        setParsedPlayers(playersList);
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedPlayers.length === 0) return;
    onBulkAddPlayers(parsedPlayers);
    setIsSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Glow ambient header */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-32 bg-cyan-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-6 pb-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Excel / CSV Bulk Player Import
              </h2>
              <p className="text-xs text-slate-400">
                Quickly import dozens or hundreds of players from spreadsheets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Download Banner */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-200">Need the correct column format?</h4>
            <p className="text-[11px] text-slate-400">Download our sample template with pre-filled columns and headers.</p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV Template</span>
          </button>
        </div>

        {/* Upload Zone & Preview Area */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Successfully imported {parsedPlayers.length} players into the tournament!</span>
            </div>
          )}

          {parsedPlayers.length === 0 ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-3xl p-8 text-center transition bg-slate-950/40">
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="font-bold text-white text-sm">Select or Drop CSV File</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Upload your completed player spreadsheet (.csv) to parse records
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 cursor-pointer transition">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Choose CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <span className="text-slate-300">
                  File: <strong className="text-cyan-400">{fileName}</strong> ({parsedPlayers.length} players ready)
                </span>
                <label className="text-xs text-slate-400 hover:text-white cursor-pointer underline">
                  Choose another file
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Parsed Players Preview Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Base Price</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">City</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {parsedPlayers.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-white">{p.name}</td>
                        <td className="py-2 px-3 font-semibold text-cyan-400">{p.role}</td>
                        <td className="py-2 px-3 font-mono text-amber-400">₹{p.basePrice.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-slate-400">{p.category}</td>
                        <td className="py-2 px-3 text-slate-400">{p.city}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedPlayers.length === 0 || isSuccess}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition cursor-pointer"
          >
            <span>Import All {parsedPlayers.length} Players</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
