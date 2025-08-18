const fs = require('fs');
const path = require('path');

// Crear un PNG mínimo de 1x1 pixel como placeholder
function createMinimalPNG(filename) {
  // PNG mínimo válido (1x1 pixel transparente)
  const minimalPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width = 1
    0x00, 0x00, 0x00, 0x01, // height = 1
    0x08, 0x06, // bit depth = 8, color type = 6 (RGBA)
    0x00, 0x00, 0x00, // compression, filter, interlace
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0xE5, 0x27, 0xDE, 0xFC, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(path.join(__dirname, filename), minimalPNG);
  console.log(`Created placeholder: ${filename}`);
}

// Crear todos los placeholders necesarios
createMinimalPNG('icon.png');
createMinimalPNG('adaptive-icon.png');
createMinimalPNG('splash.png');
createMinimalPNG('favicon.png');

console.log('\n✅ Placeholders creados!');
console.log('Estos son archivos temporales mínimos.');
console.log('Para iconos reales, abre assets/generate-assets.html en tu navegador.');