import { Player, Team } from '../types';
import { isImageLogo } from '../components/TeamLogo';

const loadImage = async (src?: string): Promise<HTMLImageElement | null> => {
  if (!src) return null;
  try {
    // Fetch as blob so the canvas is never tainted by cross-origin images.
    let url = src;
    let revoke = false;
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      const res = await fetch(src, { mode: 'cors' });
      if (!res.ok) return null;
      url = URL.createObjectURL(await res.blob());
      revoke = true;
    }
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('load failed'));
      img.src = url;
    });
    if (revoke) window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    return img;
  } catch {
    return null;
  }
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, contain = false) => {
  const scale = contain ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxW: number) => {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
};

const ROLE_SHORT: Record<string, string> = { BATSMAN: 'BAT', BOWLER: 'BOWL', ALL_ROUNDER: 'AR', WICKET_KEEPER: 'WK' };

export const renderTeamSquadImage = async (
  team: Team,
  squad: Player[],
  formatPrice: (v: number) => string,
  title?: string,
): Promise<Blob> => {
  const sorted = [...squad].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
  const W = 1080;
  const cols = 2;
  const rowH = 120;
  const headerH = 330;
  const rows = Math.ceil(sorted.length / cols) || 1;
  const H = headerH + rows * rowH + 110;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const font = (w: string, s: number) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0f1a14');
  bg.addColorStop(1, '#050806');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let x = 0; x < W; x += 120) ctx.fillRect(x, 0, 60, H);

  const [logoImg, ...photos] = await Promise.all([
    isImageLogo(team.logo) ? loadImage(team.logo) : Promise.resolve(null),
    ...sorted.map((p) => loadImage(p.photoUrl || '/player-placeholder.svg')),
  ]);

  // Header
  if (title) {
    ctx.fillStyle = '#d4f04a';
    ctx.font = font('800', 28);
    ctx.fillText(fitText(ctx, title.toUpperCase(), W - 120), 60, 70);
  }
  ctx.fillStyle = '#111915';
  roundRect(ctx, 60, 100, 150, 150, 28);
  ctx.fill();
  if (logoImg) {
    ctx.save();
    roundRect(ctx, 70, 110, 130, 130, 20);
    ctx.clip();
    drawCover(ctx, logoImg, 70, 110, 130, 130, true);
    ctx.restore();
  } else {
    ctx.font = font('900', 64);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(team.logo && !isImageLogo(team.logo) ? team.logo : team.shortCode || '🏏', 135, 198);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#fff';
  ctx.font = font('900', 56);
  ctx.fillText(fitText(ctx, team.name, W - 300), 240, 170);
  ctx.fillStyle = '#94a3b8';
  ctx.font = font('600', 30);
  ctx.fillText(fitText(ctx, team.ownerName ? `Owner: ${team.ownerName}` : '', W - 300), 240, 220);

  const spent = team.totalPurse - team.remainingPurse;
  ctx.font = font('800', 30);
  ctx.fillStyle = '#d4f04a';
  ctx.fillText(`Spent ${formatPrice(spent)}`, 60, 300);
  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'right';
  ctx.fillText(`Left ${formatPrice(team.remainingPurse)}  ·  ${sorted.length} players`, W - 60, 300);
  ctx.textAlign = 'left';

  // Players
  const cellW = (W - 120 - 20) / cols;
  sorted.forEach((p, i) => {
    const x = 60 + (i % cols) * (cellW + 20);
    const y = headerH + Math.floor(i / cols) * rowH;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRect(ctx, x, y, cellW, rowH - 16, 18);
    ctx.fill();
    const img = photos[i];
    ctx.save();
    roundRect(ctx, x + 12, y + 12, 80, 80, 14);
    ctx.clip();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 12, y + 12, 80, 80);
    if (img) drawCover(ctx, img, x + 12, y + 12, 80, 80);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = font('800', 28);
    ctx.fillText(fitText(ctx, p.name, cellW - 120), x + 108, y + 46);
    ctx.font = font('600', 22);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(ROLE_SHORT[p.role] || p.role, x + 108, y + 84);
    ctx.fillStyle = '#34d399';
    ctx.font = font('800', 24);
    ctx.textAlign = 'right';
    ctx.fillText(formatPrice(p.soldPrice || 0), x + cellW - 16, y + 84);
    ctx.textAlign = 'left';
  });

  // Footer role counts
  const count = (r: string) => sorted.filter((p) => p.role === r).length;
  ctx.fillStyle = '#cbd5e1';
  ctx.font = font('800', 26);
  ctx.textAlign = 'center';
  ctx.fillText(
    `BAT ${count('BATSMAN')}   ·   BOWL ${count('BOWLER')}   ·   AR ${count('ALL_ROUNDER')}   ·   WK ${count('WICKET_KEEPER')}`,
    W / 2,
    H - 50,
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'),
  );
};

export const shareTeamSquadImage = async (
  team: Team,
  squad: Player[],
  formatPrice: (v: number) => string,
  title?: string,
) => {
  const blob = await renderTeamSquadImage(team, squad, formatPrice, title);
  const fileName = `${team.name.replace(/[^\w-]+/g, '_')}_squad.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  const text = `${team.name} – Final Squad (${squad.length} players)`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: text, text });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  // Desktop fallback: download image, then open WhatsApp so it can be attached.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
};
