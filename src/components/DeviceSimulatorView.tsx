import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone,
  Tablet,
  RotateCw,
  ExternalLink,
  QrCode,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Shield,
  Trophy,
  Users,
  Eye,
  Radio,
  Hand,
  Check,
  Copy,
  X,
  Sparkles,
  Maximize2,
  Sliders,
  Wifi,
  Battery,
} from 'lucide-react';
import { Tournament } from '../types';

interface DeviceSimulatorViewProps {
  tournament?: Tournament;
  onClose?: () => void;
}

type DeviceType = 'iphone17pro' | 'iphone17' | 'pixel9' | 'ipadmini';
type DeviceOrientation = 'portrait' | 'landscape';

interface DevicePreset {
  id: DeviceType;
  name: string;
  width: number;
  height: number;
  radius: string;
  hasIsland: boolean;
  type: 'phone' | 'tablet';
}

const DEVICE_PRESETS: Record<DeviceType, DevicePreset> = {
  iphone17pro: {
    id: 'iphone17pro',
    name: 'iPhone 17 Pro Max',
    width: 430,
    height: 932,
    radius: 'rounded-[54px]',
    hasIsland: true,
    type: 'phone',
  },
  iphone17: {
    id: 'iphone17',
    name: 'iPhone 17',
    width: 393,
    height: 852,
    radius: 'rounded-[50px]',
    hasIsland: true,
    type: 'phone',
  },
  pixel9: {
    id: 'pixel9',
    name: 'Pixel 9 Pro',
    width: 412,
    height: 915,
    radius: 'rounded-[46px]',
    hasIsland: false,
    type: 'phone',
  },
  ipadmini: {
    id: 'ipadmini',
    name: 'iPad Mini',
    width: 768,
    height: 1024,
    radius: 'rounded-[36px]',
    hasIsland: false,
    type: 'tablet',
  },
};

export const DeviceSimulatorView: React.FC<DeviceSimulatorViewProps> = ({
  tournament,
  onClose,
}) => {
  const tournamentId = tournament?.id || 'tourney-live-2026';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<DeviceType>('iphone17pro');
  const [orientation, setOrientation] = useState<DeviceOrientation>('portrait');
  const [scale, setScale] = useState<number>(0.9);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState('09:41');

  // Screen presets
  const presets = [
    {
      id: 'player',
      label: 'Player Mobile App',
      icon: Users,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      path: '/?mode=player',
    },
    {
      id: 'registrations',
      label: 'Public Registrations',
      icon: Eye,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      path: `/?mode=registrations&tournamentId=${encodeURIComponent(tournamentId)}`,
    },
    {
      id: 'register',
      label: 'Player Registration Form',
      icon: Trophy,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      path: `/?mode=register&tournamentId=${encodeURIComponent(tournamentId)}`,
    },
    {
      id: 'summary',
      label: 'Live Auction Spectator',
      icon: Radio,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      path: `/?mode=summary&tournamentId=${encodeURIComponent(tournamentId)}`,
    },
    {
      id: 'paddle',
      label: 'Team Paddle View',
      icon: Hand,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      path: `/?mode=paddle&tournamentId=${encodeURIComponent(tournamentId)}`,
    },
    {
      id: 'organizer',
      label: 'Organizer Portal',
      icon: Shield,
      color: 'text-gold-400 bg-gold-500/10 border-gold-500/30',
      path: '/?portal=organizer',
    },
  ];

  const [activePreset, setActivePreset] = useState(presets[0].id);
  const [currentUrl, setCurrentUrl] = useState(presets[0].path);

  // Keep clock updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentPresetConfig = DEVICE_PRESETS[device];
  const isLandscape = orientation === 'landscape';
  const width = isLandscape ? currentPresetConfig.height : currentPresetConfig.width;
  const height = isLandscape ? currentPresetConfig.width : currentPresetConfig.height;

  const navigateTo = (path: string, presetId?: string) => {
    setCurrentUrl(path);
    if (presetId) setActivePreset(presetId);
    if (iframeRef.current) {
      iframeRef.current.src = path;
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const openStandaloneWindow = () => {
    const fullUrl = `${window.location.origin}${currentUrl}`;
    window.open(
      fullUrl,
      'AppSimulatorWindow',
      `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`
    );
  };

  const copyUrl = async () => {
    const fullUrl = `${window.location.origin}${currentUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <main className="relative min-h-[92vh] bg-obsidian-950 text-white flex flex-col overflow-hidden select-none">
      {/* Dynamic ambient lighting backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[55rem] h-[55rem] rounded-full bg-gold-500/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-10 left-10 w-[35rem] h-[35rem] rounded-full bg-electric-blue/10 blur-[130px]" />
        <div className="absolute top-20 right-10 w-[30rem] h-[30rem] rounded-full bg-electric-purple/10 blur-[130px]" />
      </div>

      {/* Simulator Control Toolbar */}
      <header className="relative z-20 w-full px-4 sm:px-6 py-4 bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Brand & Preset Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 mr-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold-500/20 to-amber-500/20 border border-gold-500/40">
              <Smartphone className="w-4 h-4 text-gold-400" />
              <span className="font-display text-xs font-black tracking-wide text-gold-300 uppercase">
                Device Simulator
              </span>
            </div>

            {/* Screen Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              {presets.map((preset) => {
                const Icon = preset.icon;
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => navigateTo(preset.path, preset.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-950 shadow-md shadow-gold-500/20 font-black'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Device Settings Controls */}
          <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
            {/* Device Selector */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 text-xs">
              {(['iphone17pro', 'iphone17', 'pixel9', 'ipadmini'] as DeviceType[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    device === d ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {DEVICE_PRESETS[d].name.split(' ')[0]} {DEVICE_PRESETS[d].name.split(' ')[1] || ''}
                </button>
              ))}
            </div>

            {/* Orientation Toggle */}
            <button
              type="button"
              onClick={() => setOrientation(isLandscape ? 'portrait' : 'landscape')}
              className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
              title={isLandscape ? 'Switch to Portrait' : 'Switch to Landscape'}
            >
              <RotateCw className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Scale Selector */}
            <select
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              aria-label="Simulator Zoom Scale"
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-gold-500/60"
            >
              <option value={0.75}>75% Scale</option>
              <option value={0.85}>85% Scale</option>
              <option value={0.9}>90% Scale</option>
              <option value={1}>100% Scale</option>
            </select>

            {/* Standalone Window Button */}
            <button
              type="button"
              onClick={openStandaloneWindow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition active:scale-95"
              title="Open inside independent standalone window"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gold-400" />
              <span>Popup Window</span>
            </button>

            {/* QR Code / Phone Test */}
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition active:scale-95"
              title="Test on real mobile device"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Real Phone</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Simulator Stage Arena */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative transition-all duration-500 ease-out"
        >
          {/* Realistic Hardware Frame Shell */}
          <div
            style={{ width: `${width}px`, height: `${height}px` }}
            className={`relative ${currentPresetConfig.radius} bg-[#1a1b20] p-[12px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.15),0_0_50px_rgba(217,119,6,0.15)] ring-1 ring-white/10 flex flex-col`}
          >
            {/* Specular Titanium Edge Shimmer */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 ${currentPresetConfig.radius} bg-gradient-to-tr from-white/15 via-transparent to-white/5 opacity-70`}
            />

            {/* Side hardware buttons (Left volume, Right power) */}
            {!isLandscape && currentPresetConfig.type === 'phone' && (
              <>
                <div className="absolute -left-[14px] top-28 w-[3px] h-10 bg-slate-700 rounded-l-md shadow-sm" />
                <div className="absolute -left-[14px] top-42 w-[3px] h-12 bg-slate-700 rounded-l-md shadow-sm" />
                <div className="absolute -left-[14px] top-58 w-[3px] h-12 bg-slate-700 rounded-l-md shadow-sm" />
                <div className="absolute -right-[14px] top-36 w-[3px] h-16 bg-slate-700 rounded-r-md shadow-sm" />
              </>
            )}

            {/* Inner Screen Display */}
            <div className={`relative w-full h-full ${currentPresetConfig.radius} overflow-hidden bg-black flex flex-col border border-white/5`}>
              {/* iPhone Status Bar & Dynamic Island */}
              {!isLandscape && currentPresetConfig.hasIsland && (
                <div className="absolute top-0 left-0 right-0 h-11 px-7 flex items-center justify-between z-30 pointer-events-none select-none">
                  {/* Status Bar Time */}
                  <span className="text-[13px] font-semibold text-white/90 tracking-tight">
                    {currentTime}
                  </span>

                  {/* Dynamic Island Pill */}
                  <div className="relative w-28 h-7 bg-black rounded-full border border-white/10 flex items-center justify-between px-2.5 shadow-md">
                    {/* Front camera lens reflection */}
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700/60 ring-1 ring-blue-500/20" />
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[9px] font-black text-rose-400">AUCTION</span>
                    </span>
                  </div>

                  {/* Status Bar Icons */}
                  <div className="flex items-center gap-1.5 text-white/90">
                    <Wifi className="w-3.5 h-3.5" />
                    <div className="w-5 h-2.5 rounded-[4px] border border-white/80 p-0.5 flex items-center">
                      <div className="w-full h-full bg-white rounded-[2px]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Web App iframe */}
              <iframe
                ref={iframeRef}
                src={currentUrl}
                title="Mobile Web App Simulator"
                className="w-full flex-1 border-0 bg-obsidian-950"
                style={{ paddingTop: !isLandscape && currentPresetConfig.hasIsland ? '44px' : '0' }}
              />

              {/* Bottom iOS Home Indicator Bar */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full z-30 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Real Phone QR Code Modal */}
      {isQrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl p-6 text-white text-center space-y-4">
            <button
              type="button"
              onClick={() => setIsQrOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 grid place-items-center mx-auto text-emerald-400">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-display font-black text-white">
                Test on Real Mobile Phone
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Scan with your iPhone Camera or Android QR scanner connected to the same Wi-Fi.
              </p>
            </div>

            {/* QR Code Canvas / Image */}
            <div className="p-3 bg-white rounded-2xl shadow-inner mx-auto w-48 h-48 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `http://192.168.1.14:5174${currentUrl}`
                )}`}
                alt="Mobile QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Local Network URL */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 truncate">http://192.168.1.14:5174{currentUrl}</span>
              <button
                type="button"
                onClick={copyUrl}
                className="p-1.5 text-gold-400 hover:text-gold-300 shrink-0 ml-2"
                title="Copy URL"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Make sure your mobile phone is on the same local network (Wi-Fi).
            </p>
          </div>
        </div>
      )}
    </main>
  );
};
