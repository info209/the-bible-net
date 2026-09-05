const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure public/icons directory exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate an uncompressed or zlib-compressed PNG file with a clean Holy Bible & Cross app logo
function createPngIcon(size, bgColor = [0, 106, 111], fgColor = [255, 255, 255]) {
  // Width and height
  const width = size;
  const height = size;

  // RGBA buffer (4 bytes per pixel + 1 filter byte per scanline)
  const rowBytes = width * 4 + 1;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = bgColor[0];
      let g = bgColor[1];
      let b = bgColor[2];
      let a = 255;

      // Soft rounded squircle / circle background
      const cornerRadius = size * 0.22;
      const inRoundedBox =
        x >= cornerRadius &&
        x <= width - cornerRadius &&
        y >= cornerRadius &&
        y <= height - cornerRadius;

      const isCorner =
        (x < cornerRadius || x > width - cornerRadius) &&
        (y < cornerRadius || y > height - cornerRadius);

      if (isCorner) {
        const cornerX = x < cornerRadius ? cornerRadius : width - cornerRadius;
        const cornerY = y < cornerRadius ? cornerRadius : height - cornerRadius;
        const cdx = x - cornerX;
        const cdy = y - cornerY;
        if (Math.sqrt(cdx * cdx + cdy * cdy) > cornerRadius) {
          a = 0;
        }
      }

      // Draw stylized Open Bible & Cross in the center if inside background
      if (a > 0) {
        // Cross vertical bar: center, thickness size * 0.06, height size * 0.38
        const crossThick = Math.max(2, Math.round(size * 0.055));
        const crossTop = cy - size * 0.22;
        const crossBottom = cy + size * 0.22;
        const isCrossVert =
          Math.abs(x - cx) <= crossThick && y >= crossTop && y <= crossBottom;

        // Cross horizontal bar: height size * 0.055, width size * 0.26, at y = cy - size * 0.08
        const crossHorizY = cy - size * 0.08;
        const crossLeft = cx - size * 0.14;
        const crossRight = cx + size * 0.14;
        const isCrossHoriz =
          Math.abs(y - crossHorizY) <= crossThick && x >= crossLeft && x <= crossRight;

        // Bible pages curve at bottom
        const pageLeft = cx - size * 0.28;
        const pageRight = cx + size * 0.28;
        const pageTop = cy + size * 0.16;
        const pageBottom = cy + size * 0.32;
        const isBibleOutline =
          x >= pageLeft &&
          x <= pageRight &&
          y >= pageTop &&
          y <= pageBottom &&
          (Math.abs(y - pageBottom) <= crossThick ||
            Math.abs(x - pageLeft) <= crossThick ||
            Math.abs(x - pageRight) <= crossThick ||
            Math.abs(x - cx) <= Math.max(1, Math.round(crossThick / 2)));

        if (isCrossVert || isCrossHoriz || isBibleOutline) {
          r = fgColor[0];
          g = fgColor[1];
          b = fgColor[2];
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // Helper for CRC32
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const typeAndData = buf.subarray(4, 8 + len);
    const crc = crc32(typeAndData);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Generate standard icons
const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-maskable.png', size: 512 },
];

for (const { name, size } of sizes) {
  const filePath = path.join(iconsDir, name);
  const pngBuf = createPngIcon(size);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated ${name} (${size}x${size})`);
}

console.log('PWA icons created successfully.');
