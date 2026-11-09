import qrcode from 'qrcode-generator';

/** Builds a scannable QR code on this device, so it also works on poor venue internet. */
export function qrDataUrl(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 8, margin: 16, scalable: true });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
