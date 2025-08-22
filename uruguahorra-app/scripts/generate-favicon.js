const fs = require('fs');
const path = require('path');

// Generar un favicon PNG válido de 32x32 píxeles
function generateFaviconPNG() {
  // PNG header y estructura mínima válida para un PNG de 32x32
  const width = 32;
  const height = 32;

  // Crear un buffer para el PNG
  const chunks = [];

  // PNG signature
  chunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(createChunk('IHDR', ihdr));

  // Create image data - purple background with "U" letter
  const imageData = [];
  for (let y = 0; y < height; y++) {
    imageData.push(0); // filter type
    for (let x = 0; x < width; x++) {
      // Purple background (#6366F1)
      let r = 0x63,
        g = 0x66,
        b = 0xf1,
        a = 0xff;

      // Draw a simple "U" in white in the center
      const inU =
        (x >= 10 && x <= 12 && y >= 8 && y <= 20) || // left vertical
        (x >= 20 && x <= 22 && y >= 8 && y <= 20) || // right vertical
        (x >= 10 && x <= 22 && y >= 20 && y <= 22); // bottom horizontal

      if (inU) {
        r = g = b = 0xff; // white
      }

      imageData.push(r, g, b, a);
    }
  }

  // Compress using simple zlib (uncompressed for simplicity)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(imageData));
  chunks.push(createChunk('IDAT', compressed));

  // IEND chunk
  chunks.push(createChunk('IEND', Buffer.alloc(0)));

  // Combine all chunks
  return Buffer.concat(chunks);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.concat([typeBuffer, data]);

  // Calculate CRC
  const crc = calculateCRC(chunk);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, chunk, crcBuffer]);
}

function calculateCRC(buffer) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0; // ensure unsigned
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = (table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0; // ensure unsigned
}

// Generate and save the favicon
const faviconPath = path.join(__dirname, '..', 'assets', 'favicon.png');
const faviconData = generateFaviconPNG();
fs.writeFileSync(faviconPath, faviconData);
console.log(`✅ Favicon generado exitosamente: ${faviconPath}`);
console.log(`   Tamaño: ${faviconData.length} bytes`);
