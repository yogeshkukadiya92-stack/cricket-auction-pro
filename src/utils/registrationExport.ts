import { Player, CustomFormField } from '../types';

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const text = (v: unknown) => v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
const imageData = (v: unknown) => typeof v === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/.test(v);

async function excelImage(data: string): Promise<string> {
  if (!data.startsWith('data:image/webp')) return data;
  const img = new Image();
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Could not read uploaded image')); img.src = data; });
  const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function exportRegistrationsExcel(players: Player[], fields: CustomFormField[] = []) {
  // @ts-ignore
  const { default: ExcelJS } = await import(/* @vite-ignore */ 'exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Registrations');
  const keys = [...new Set(players.flatMap(p => Object.keys(p)))].filter(k => !['photoUrl', 'paymentScreenshotUrl', 'customData', 'stats'].includes(k));
  const stats = [...new Set(players.flatMap(p => Object.keys(p.stats || {})))];
  const custom = [...new Set(players.flatMap(p => Object.keys(p.customData || {})))];
  sheet.columns = [ ...keys.map(k => ({ header: k, key: k, width: 24 })), ...stats.map(k => ({ header: `Stats: ${k}`, key: `stats.${k}`, width: 18 })), ...custom.map(k => ({ header: fields.find(f => f.id === k)?.label || k, key: `custom.${k}`, width: 30 })), { header: 'Player Photo', key: 'photo', width: 24 }, { header: 'Payment Screenshot', key: 'receipt', width: 30 } ];
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  for (const player of players) {
    const values: Record<string, string> = {};
    keys.forEach(k => { values[k] = text(player[k as keyof Player]); });
    stats.forEach(k => { values[`stats.${k}`] = text(player.stats?.[k]); });
    custom.forEach(k => { values[`custom.${k}`] = imageData(player.customData?.[k]) ? 'Uploaded image — see ZIP' : text(player.customData?.[k]); });
    const row = sheet.addRow(values); row.height = 100;
    for (const [key, source] of [['photo', player.photoUrl], ['receipt', player.paymentScreenshotUrl]]) {
      if (!source) continue;
      if (!imageData(source)) { row.getCell(key).value = source; continue; }
      const base64 = await excelImage(source);
      const extension = base64.startsWith('data:image/jpeg') ? 'jpeg' : base64.startsWith('data:image/gif') ? 'gif' : 'png';
      const id = workbook.addImage({ base64, extension });
      sheet.addImage(id, { tl: { col: sheet.getColumn(key).number - 1, row: row.number - 1 }, ext: { width: 110, height: 125 } });
    }
  }
  const bytes = await workbook.xlsx.writeBuffer();
  saveBlob(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `registrations_${Date.now()}.xlsx`);
}

export async function downloadRegistrationImages(players: Player[]) {
  // @ts-ignore
  const { default: JSZip } = await import(/* @vite-ignore */ 'jszip');
  const zip = new JSZip();
  let count = 0;
  for (const p of players) {
    const folder = zip.folder(`${p.name.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 60)}_${p.id}`)!;
    for (const [name, data] of [['player-photo', p.photoUrl], ['payment-receipt', p.paymentScreenshotUrl], ...Object.entries(p.customData || {})]) {
      if (!imageData(data)) continue;
      const match = String(data).match(/^data:image\/(\w+);base64,(.+)$/)!;
      folder.file(`${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`, match[2], { base64: true }); count++;
    }
  }
  if (!count) throw new Error('No uploaded images found.');
  saveBlob(await zip.generateAsync({ type: 'blob' }), `registration_photos_${Date.now()}.zip`);
}
