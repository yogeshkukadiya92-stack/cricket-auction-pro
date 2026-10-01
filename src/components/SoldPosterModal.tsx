import { formatAuctionPrice } from '../utils/currency';
import React, { useEffect, useRef } from 'react';
import { Player, Team, Tournament } from '../types';
import { Download, Share2, X, Check, Award } from 'lucide-react';
import { isImageLogo } from './TeamLogo';

interface SoldPosterModalProps {
  player: Player;
  team: Team;
  price: number;
  tournament: Tournament;
  onClose: () => void;
}

export const SoldPosterModal: React.FC<SoldPosterModalProps> = ({
  player,
  team,
  price,
  tournament,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatPrice = (val: number) => {
    return formatAuctionPrice(val, tournament.rules?.currency);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-res 1080x1080
    canvas.width = 1080;
    canvas.height = 1080;

    const drawScene = (playerImg: HTMLImageElement | null, teamLogoImg: HTMLImageElement | null) => {
      // 1. Draw Deep Space Background
      const bgGrad = ctx.createRadialGradient(540, 540, 100, 540, 540, 700);
      bgGrad.addColorStop(0, '#111A2E');
      bgGrad.addColorStop(0.5, '#070C16');
      bgGrad.addColorStop(1, '#04070D');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // 2. Draw Golden Border Frame
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 14;
      ctx.strokeRect(30, 30, 1020, 1020);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(45, 45, 990, 990);

      // 3. Header Tournament Ribbon
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${tournament.name.toUpperCase()} • ${tournament.season.toUpperCase()}`, 540, 110);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('OFFICIAL MEGA AUCTION 2026', 540, 150);

      // 4. Draw Player Photo (with circle clip)
      if (playerImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 390, 190, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        try {
          ctx.drawImage(playerImg, 350, 200, 380, 380);
        } catch (e) {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(350, 200, 380, 380);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(540, 390, 190, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer Ring
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(540, 390, 195, 0, Math.PI * 2);
      ctx.stroke();

      // 5. Player Name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 58px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(player.name.toUpperCase(), 540, 645);

      // Player Role Badge
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`${player.role} • ${player.battingStyle}`, 540, 695);

      // 6. SOLD Ribbon Box
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.roundRect(290, 735, 500, 65, 30);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = '900 36px sans-serif';
      ctx.fillText('⚡ OFFICIALLY SOLD ⚡', 540, 780);

      // 7. Huge Sold Price
      ctx.fillStyle = '#FBBF24';
      ctx.font = '900 80px sans-serif';
      ctx.fillText(formatPrice(price), 540, 885);

      // 8. Winning Team Details
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';

      if (teamLogoImg) {
        const teamLabel = `BOUGHT BY: ${team.name.toUpperCase()}`;
        const textMetrics = ctx.measureText(teamLabel);
        const iconSize = 46;
        const spacing = 14;
        const totalW = iconSize + spacing + textMetrics.width;
        const startX = 540 - totalW / 2;

        try {
          ctx.drawImage(teamLogoImg, startX, 920, iconSize, iconSize);
        } catch (e) {
          // ignore error
        }

        ctx.textAlign = 'left';
        ctx.fillText(teamLabel, startX + iconSize + spacing, 955);
        ctx.textAlign = 'center';
      } else {
        const logoStr = isImageLogo(team.logo) ? '🛡️' : team.logo;
        ctx.fillText(`BOUGHT BY: ${logoStr} ${team.name.toUpperCase()}`, 540, 955);
      }

      ctx.fillStyle = '#94A3B8';
      ctx.font = '22px sans-serif';
      ctx.fillText(`Franchise Owner: ${team.ownerName}`, 540, 995);
    };

    let pImg: HTMLImageElement | null = null;
    let tImg: HTMLImageElement | null = null;
    let pLoaded = false;
    let tLoaded = !isImageLogo(team.logo);

    const tryRender = () => {
      if (pLoaded && tLoaded) {
        drawScene(pImg, tImg);
      }
    };

    // Load Player Image
    pImg = new Image();
    pImg.crossOrigin = 'anonymous';
    pImg.src = player.photoUrl;
    pImg.onload = () => {
      pLoaded = true;
      tryRender();
    };
    pImg.onerror = () => {
      pImg = null;
      pLoaded = true;
      tryRender();
    };

    // Load Team Logo Image if PNG/URL
    if (isImageLogo(team.logo)) {
      tImg = new Image();
      tImg.crossOrigin = 'anonymous';
      tImg.src = team.logo;
      tImg.onload = () => {
        tLoaded = true;
        tryRender();
      };
      tImg.onerror = () => {
        tImg = null;
        tLoaded = true;
        tryRender();
      };
    } else {
      tryRender();
    }
  }, [player, team, price, tournament]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${player.name.replace(/\s+/g, '_')}_Sold_${team.shortCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleWhatsAppShare = () => {
    const text = `🏏 *${tournament.name} AUCTION UPDATE!*\n\n🔥 *${player.name}* (${player.role}) has been officially *SOLD* to *${team.name}* for *${formatPrice(price)}*!\n\n👑 Franchise Owner: ${team.ownerName}\n#CricketAuction #${tournament.name.replace(/\s+/g, '')}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative max-w-xl w-full rounded-3xl p-6 bg-obsidian-900 border border-white/10 shadow-2xl flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black text-white font-display mb-1 flex items-center gap-2">
          <Award className="w-5 h-5 text-gold-400" />
          OFFICIAL "SOLD" SOCIAL POSTER
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Instagram & WhatsApp HD Poster automatically generated for viral sharing.
        </p>

        {/* Canvas Display */}
        <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden border-2 border-gold-400/50 shadow-glow-gold mb-6 bg-black">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            onClick={handleDownload}
            className="flex-1 min-w-[150px] py-3 px-4 rounded-xl font-black text-xs bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Download HD Poster (.PNG)
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="flex-1 min-w-[150px] py-3 px-4 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 text-black shadow-glow-emerald flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share to WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
