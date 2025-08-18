const fs = require('fs');
const path = require('path');

// Crear un PNG válido con dimensiones reales
function createValidPNG(filename, width, height) {
  const crc32 = (buf) => {
    let c;
    const crcTable = [];
    for(let n = 0; n < 256; n++){
      c = n;
      for(let k = 0; k < 8; k++){
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[n] = c;
    }
    
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++ ) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  };

  const chunks = [];
  
  // PNG signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  
  // IHDR chunk
  const ihdr = Buffer.concat([
    Buffer.from('IHDR'),
    Buffer.from([
      (width >> 24) & 0xff, (width >> 16) & 0xff, (width >> 8) & 0xff, width & 0xff,
      (height >> 24) & 0xff, (height >> 16) & 0xff, (height >> 8) & 0xff, height & 0xff,
      8, 2, 0, 0, 0 // bit depth, color type (RGB), compression, filter, interlace
    ])
  ]);
  
  chunks.push(Buffer.from([0, 0, 0, 13])); // IHDR length
  chunks.push(ihdr);
  chunks.push(Buffer.from([
    (crc32(ihdr) >> 24) & 0xff,
    (crc32(ihdr) >> 16) & 0xff,
    (crc32(ihdr) >> 8) & 0xff,
    crc32(ihdr) & 0xff
  ]));
  
  // IDAT chunk - imagen simple de color sólido
  const pixelData = [];
  for (let y = 0; y < height; y++) {
    pixelData.push(0); // filter type
    for (let x = 0; x < width; x++) {
      // Color índigo (#6366F1)
      pixelData.push(0x63, 0x66, 0xF1);
    }
  }
  
  // Comprimir datos con zlib simple
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(pixelData));
  
  const idat = Buffer.concat([
    Buffer.from('IDAT'),
    compressed
  ]);
  
  const idatLength = compressed.length + 4;
  chunks.push(Buffer.from([
    (idatLength >> 24) & 0xff,
    (idatLength >> 16) & 0xff,
    (idatLength >> 8) & 0xff,
    idatLength & 0xff
  ]));
  chunks.push(idat);
  chunks.push(Buffer.from([
    (crc32(idat) >> 24) & 0xff,
    (crc32(idat) >> 16) & 0xff,
    (crc32(idat) >> 8) & 0xff,
    crc32(idat) & 0xff
  ]));
  
  // IEND chunk
  chunks.push(Buffer.from([0, 0, 0, 0])); // IEND length
  const iend = Buffer.from('IEND');
  chunks.push(iend);
  chunks.push(Buffer.from([
    (crc32(iend) >> 24) & 0xff,
    (crc32(iend) >> 16) & 0xff,
    (crc32(iend) >> 8) & 0xff,
    crc32(iend) & 0xff
  ]));
  
  const png = Buffer.concat(chunks);
  fs.writeFileSync(path.join(__dirname, filename), png);
  console.log(`Created valid PNG: ${filename} (${width}x${height})`);
}

// Crear los archivos necesarios
createValidPNG('icon.png', 512, 512);
createValidPNG('adaptive-icon.png', 512, 512);
createValidPNG('splash.png', 1284, 2778);
createValidPNG('favicon.png', 32, 32);

console.log('\n✅ Archivos PNG válidos creados!');
console.log('Son imágenes de color sólido índigo (#6366F1)');
console.log('Para iconos personalizados, usa un editor de imágenes o genera desde generate-assets.html');