/** Resolve deferred uploads only when an export needs bytes. */
export async function readExportImage(source) {
  if (typeof source !== 'string') return null;
  if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(source)) return source;
  if (!/^\/api\/(?:public\/)?tournaments\//.test(source)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(source, { credentials: 'same-origin', signal: controller.signal });
    if (!response.ok) throw new Error('Could not download an uploaded image. Retry the export.');
    const type = response.headers.get('content-type')?.split(';')[0];
    if (!/^image\/(png|jpeg|webp|gif)$/.test(type || '')) throw new Error('The uploaded image is unavailable. Retry the export.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return `data:${type};base64,${btoa(binary)}`;
  } finally { clearTimeout(timer); }
}
