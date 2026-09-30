import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Trophy, RotateCw, CheckCircle, Users, Award, Volume2, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Team, Player } from '../types';
import { sounds } from '../soundEffects';
import { TeamLogo } from './TeamLogo';

interface FortuneWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  players?: Player[];
  onSelectPlayer?: (player: Player) => void;
}

interface WheelSector {
  id: string;
  name: string;
  color: string;
  logo?: string;
  type: 'TEAM' | 'PLAYER';
  data: any;
}

export const FortuneWheelModal: React.FC<FortuneWheelModalProps> = ({
  isOpen,
  onClose,
  teams,
  players = [],
  onSelectPlayer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wheelMode, setWheelMode] = useState<'TEAMS' | 'PLAYERS'>('TEAMS');
  const [removeAfterSpin, setRemoveAfterSpin] = useState<boolean>(true);
  const [availableSectors, setAvailableSectors] = useState<WheelSector[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelSector | null>(null);
  const [spinHistory, setSpinHistory] = useState<WheelSector[]>([]);

  // Wheel physics state stored in refs to avoid React re-render lag during 60FPS animation
  const angleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTickIndexRef = useRef<number>(-1);

  // Vivid fallback colors
  const defaultColors = [
    '#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', 
    '#EF4444', '#06B6D4', '#EAB308', '#6366F1', '#14B8A6'
  ];

  // Initialize sectors based on mode
  useEffect(() => {
    if (!isOpen) return;

    if (wheelMode === 'TEAMS') {
      const sectors: WheelSector[] = teams.map((team, idx) => ({
        id: team.id,
        name: team.name,
        color: team.colorHex || defaultColors[idx % defaultColors.length],
        logo: team.logo,
        type: 'TEAM',
        data: team,
      }));
      setAvailableSectors(sectors.length > 0 ? sectors : [
        { id: '1', name: 'Team Alpha', color: '#F59E0B', type: 'TEAM', data: null },
        { id: '2', name: 'Team Beta', color: '#3B82F6', type: 'TEAM', data: null },
      ]);
    } else {
      const availPlayers = players.filter((p) => p.status === 'AVAILABLE' && (!p.approvalStatus || p.approvalStatus === 'APPROVED'));
      const sample = availPlayers.slice(0, 16); // up to 16 for readable wheel slices
      const sectors: WheelSector[] = sample.map((player, idx) => ({
        id: player.id,
        name: player.name,
        color: defaultColors[idx % defaultColors.length],
        logo: player.photoUrl,
        type: 'PLAYER',
        data: player,
      }));
      setAvailableSectors(sectors.length > 0 ? sectors : [
        { id: 'p1', name: 'Player 1', color: '#10B981', type: 'PLAYER', data: null },
        { id: 'p2', name: 'Player 2', color: '#EC4899', type: 'PLAYER', data: null },
      ]);
    }
    setWinner(null);
  }, [isOpen, wheelMode, teams, players]);

  // Draw Wheel on Canvas
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2;
    const count = availableSectors.length;
    if (count === 0) return;

    const sliceAngle = (2 * Math.PI) / count;
    const currentAngle = angleRef.current;

    ctx.clearRect(0, 0, width, height);

    // Save context for rotation
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(currentAngle);

    // Draw Slices
    for (let i = 0; i < count; i++) {
      const sector = availableSectors[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 8, startAngle, endAngle);
      ctx.closePath();

      // Sector background with gradient sheen
      ctx.fillStyle = sector.color;
      ctx.fill();
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text label inside slice
      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;

      // Truncate long names
      const displayName = sector.name.length > 14 ? sector.name.slice(0, 12) + '...' : sector.name;
      ctx.fillText(displayName, radius - 24, 5);
      ctx.restore();
    }

    ctx.restore();

    // Outer Glowing Rim Ring
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Inner Center Hub Cap
    ctx.beginPath();
    ctx.arc(radius, radius, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center Gold Icon / Label
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', radius, radius);
  };

  useEffect(() => {
    drawWheel();
  }, [availableSectors]);

  // Spin Logic with smooth easing physics
  const spinWheel = () => {
    if (isSpinning || availableSectors.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    const count = availableSectors.length;
    const sliceAngle = (2 * Math.PI) / count;

    // Pick random target sector
    const targetIndex = Math.floor(Math.random() * count);
    const fullSpins = 5 + Math.floor(Math.random() * 4); // 5 to 8 full 360-degree rotations

    // Top pointer is at -Math.PI / 2 (12 o'clock)
    // To land on targetIndex, we calculate the required final angle
    const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
    // Normalized offset so target lands right under the top needle:
    const targetOffset = (3 * Math.PI) / 2 - targetSliceCenter;
    const totalRotation = fullSpins * 2 * Math.PI + (targetOffset % (2 * Math.PI));

    const startAngle = angleRef.current % (2 * Math.PI);
    const distance = totalRotation + (2 * Math.PI - startAngle);
    const duration = 4500; // 4.5 seconds of high-excitement spinning
    const startTime = performance.now();

    // Ease-out cubic polynomial for thrilling deceleration
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3.2);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentRotation = startAngle + distance * easedProgress;
      angleRef.current = currentRotation;

      // Sound tick on slice boundaries
      const normalizedAngle = (2 * Math.PI - (currentRotation % (2 * Math.PI))) % (2 * Math.PI);
      const currentSlice = Math.floor(normalizedAngle / sliceAngle) % count;
      if (currentSlice !== lastTickIndexRef.current) {
        sounds.playTick();
        lastTickIndexRef.current = currentSlice;
      }

      drawWheel();

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const winningSector = availableSectors[targetIndex];
        setWinner(winningSector);
        setSpinHistory((prev) => [winningSector, ...prev]);

        // Celebrate with Confetti!
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#FFFFFF'],
        });

        // Optionally remove selected item for subsequent rounds
        if (removeAfterSpin && availableSectors.length > 1) {
          setTimeout(() => {
            setAvailableSectors((prev) => prev.filter((_, idx) => idx !== targetIndex));
          }, 1500);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleResetWheel = () => {
    if (wheelMode === 'TEAMS') {
      setAvailableSectors(
        teams.map((t, idx) => ({
          id: t.id,
          name: t.name,
          color: t.colorHex || defaultColors[idx % defaultColors.length],
          logo: t.logo,
          type: 'TEAM',
          data: t,
        }))
      );
    } else {
      const avail = players.filter((p) => p.status === 'AVAILABLE');
      setAvailableSectors(
        avail.slice(0, 16).map((p, idx) => ({
          id: p.id,
          name: p.name,
          color: defaultColors[idx % defaultColors.length],
          logo: p.photoUrl,
          type: 'PLAYER',
          data: p,
        }))
      );
    }
    setWinner(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Glow ambient header */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-5 pb-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Interactive Fortune Wheel
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Lucky Draw
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Spin the wheel for random team draft order, tie-breakers, or lottery picks
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

        {/* Mode Selector & Controls Bar */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setWheelMode('TEAMS');
                setWinner(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                wheelMode === 'TEAMS'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Franchise Teams ({teams.length})
            </button>
            <button
              onClick={() => {
                setWheelMode('PLAYERS');
                setWinner(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                wheelMode === 'PLAYERS'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Player Lot Draw
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={removeAfterSpin}
                onChange={(e) => setRemoveAfterSpin(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Remove selected after spin</span>
            </label>

            <button
              onClick={handleResetWheel}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 transition"
              title="Reset full wheel"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Wheel Body */}
        <div className="p-6 flex flex-col md:flex-row items-center justify-center gap-8 overflow-y-auto">
          {/* Wheel Stage with Top Needle Pointer */}
          <div className="relative flex flex-col items-center">
            {/* Pointer Needle at Top */}
            <div className="relative z-20 -mb-3 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(245,158,11,0.6)] animate-bounce" />
            </div>

            {/* Canvas Wheel */}
            <div className="relative p-2 rounded-full bg-slate-950 border-4 border-slate-800/80 shadow-2xl shadow-amber-500/10">
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="rounded-full select-none cursor-pointer"
                onClick={spinWheel}
              />
            </div>

            {/* Spin CTA Button */}
            <button
              onClick={spinWheel}
              disabled={isSpinning || availableSectors.length === 0}
              className="mt-5 px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/25 text-sm uppercase tracking-wider flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Spinning...' : 'SPIN THE WHEEL'}</span>
            </button>
          </div>

          {/* Winner Display & History Card */}
          <div className="w-full md:w-64 space-y-4">
            {winner ? (
              <div className="p-5 bg-gradient-to-b from-amber-500/20 to-slate-950 border-2 border-amber-500/60 rounded-2xl text-center space-y-2.5 animate-zoomIn shadow-xl">
                <div className="inline-flex p-2 bg-amber-500 text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider">
                  🎉 Selected Winner
                </div>

                {winner.logo && (
                  <div className="w-16 h-16 mx-auto rounded-xl bg-slate-900 border border-slate-700 p-1 overflow-hidden flex items-center justify-center">
                    <img src={winner.logo} alt={winner.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                )}

                <h3 className="text-lg font-black text-white">{winner.name}</h3>

                {winner.type === 'PLAYER' && onSelectPlayer && (
                  <button
                    onClick={() => {
                      onSelectPlayer(winner.data);
                      onClose();
                    }}
                    className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition"
                  >
                    Send to Auction Floor &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                <Trophy className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
                <p>Click <strong>SPIN THE WHEEL</strong> to select a random team or player.</p>
              </div>
            )}

            {/* Spin History */}
            {spinHistory.length > 0 && (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <span>Spin History</span>
                  <span className="text-amber-400">{spinHistory.length}</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {spinHistory.map((item, index) => (
                    <div
                      key={index}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-white truncate">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">#{spinHistory.length - index}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
