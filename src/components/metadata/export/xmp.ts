// XMP metadata embed helpers — pure data-URL transforms, no DOM/IO.
// Moved from Studio assetActionsFlow.ts (Fase 2).

export const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

export const pngCrc32 = (bytes: Uint8Array, start: number, length: number): number => {
  let crc = 0xFFFFFFFF;
  for (let i = start; i < start + length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

export const xmpEscapeText = (text: string): string =>
  String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const buildXmpPacket = ({ title = '', description = '', keywords = [] }: { title?: string; description?: string; keywords?: string[] }): string => {
  const kwList = (Array.isArray(keywords) ? keywords : []).map(k => String(k).trim()).filter(Boolean);
  const safeTitle = xmpEscapeText(title);
  const safeDesc = xmpEscapeText(description);
  const safeKeywords = kwList.map(xmpEscapeText).join(' ');
  return [
    '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="IMAGIN Vector Studio">',
    '  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    `      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${safeTitle}</rdf:li></rdf:Alt></dc:title>`,
    `      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${safeDesc}</rdf:li></rdf:Alt></dc:description>`,
    `      <dc:subject>${kwList.map(k => `<rdf:li>${k}</rdf:li>`).join('')}</dc:subject>`,
    '    </rdf:Description>',
    '  </rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join('\n');
};

export const embedXmpIntoPngBytes = (bytes: Uint8Array, meta: { title?: string; description?: string; keywords?: string[] } = {}): Uint8Array | null => {
  const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return null;
  }
  if (bytes.length < 8 + 8 + 4 + 4) return null;
  if (String.fromCharCode(bytes[8 + 4], bytes[8 + 5], bytes[8 + 6], bytes[8 + 7]) !== 'IHDR') return null;

  const key = 'XML:com.adobe.xmp';
  const packet = buildXmpPacket(meta);
  const data = new Uint8Array(key.length + 1 + 1 + 1 + 1 + 1 + packet.length);
  let off = 0;
  for (let i = 0; i < key.length; i++) data[off++] = key.charCodeAt(i);
  data[off++] = 0; // null separator
  data[off++] = 0; // compression flag = 0 (uncompressed)
  data[off++] = 0; // compression method = 0
  data[off++] = 0; // language tag = empty
  data[off++] = 0; // translated keyword = empty
  for (let i = 0; i < packet.length; i++) data[off++] = packet.charCodeAt(i);

  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, data.length, false);
  const type = new Uint8Array([0x69, 0x54, 0x58, 0x74]); // "iTXt"
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(type, 0);
  crcInput.set(data, 4);
  const crc = new Uint8Array(4);
  new DataView(crc.buffer).setUint32(0, pngCrc32(crcInput, 0, crcInput.length), false);

  const insertAt = 8 + 8 + 13 + 4; // signature(8) + IHDR chunk header(8) + data(13) + CRC(4) = 33
  const out = new Uint8Array(bytes.length + 12 + data.length);
  out.set(bytes.subarray(0, insertAt), 0);
  out.set(len, insertAt);
  out.set(type, insertAt + 4);
  out.set(data, insertAt + 8);
  out.set(crc, insertAt + 8 + data.length);
  out.set(bytes.subarray(insertAt), insertAt + 12 + data.length);
  return out;
};

export const embedXmpMetadata = (dataUrl: string, { title = '', description = '', keywords = [] }: { title?: string; description?: string; keywords?: string[] }): string | null => {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return null;
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);

  // PNG data URL
  if (header.startsWith('data:image/png') && header.includes(';base64')) {
    try {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const withMeta = embedXmpIntoPngBytes(bytes, { title, description, keywords });
      if (!withMeta) return dataUrl;
      let out = '';
      for (let i = 0; i < withMeta.length; i++) out += String.fromCharCode(withMeta[i]);
      return 'data:image/png;base64,' + btoa(out);
    } catch (err) {
      console.warn('[XMP] PNG embed gagal, pakai asli:', err);
      return dataUrl;
    }
  }

  // JPEG data URL — sisipkan APP1 Exif (XMP) setelah SOI (0xFFD8)
  if (header.startsWith('data:image/jpeg') && header.includes(';base64')) {
    try {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return dataUrl;

      const packet = buildXmpPacket({ title, description, keywords });
      const xmpBytes = new Uint8Array(packet.length);
      for (let i = 0; i < packet.length; i++) xmpBytes[i] = packet.charCodeAt(i);
      const headerStr = 'http://ns.adobe.com/xap/1.0/\0';
      const app1 = new Uint8Array(4 + headerStr.length + xmpBytes.length);
      const dv = new DataView(app1.buffer);
      app1[0] = 0xFF; app1[1] = 0xE1;
      const segLen = 2 + headerStr.length + xmpBytes.length;
      dv.setUint16(2, segLen, false);
      for (let i = 0; i < headerStr.length; i++) app1[4 + i] = headerStr.charCodeAt(i);
      app1.set(xmpBytes, 4 + headerStr.length);

      const out = new Uint8Array(bytes.length + app1.length);
      out.set(bytes.subarray(0, 2), 0);   // SOI
      out.set(app1, 2);                    // APP1 XMP
      out.set(bytes.subarray(2), 2 + app1.length); // rest
      let outStr = '';
      for (let i = 0; i < out.length; i++) outStr += String.fromCharCode(out[i]);
      return 'data:image/jpeg;base64,' + btoa(outStr);
    } catch (err) {
      console.warn('[XMP] JPEG embed gagal, pakai asli:', err);
      return dataUrl;
    }
  }

  return dataUrl;
};