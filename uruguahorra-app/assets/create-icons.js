// Script para crear iconos placeholder
const fs = require('fs');
const path = require('path');

// SVG base para el icono
const iconSVG = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="224" fill="#6366F1"/>
  <circle cx="512" cy="400" r="120" fill="white"/>
  <path d="M400 600 C400 500, 624 500, 624 600 L624 700 C624 750, 576 768, 512 768 C448 768, 400 750, 400 700 Z" fill="white"/>
  <text x="512" y="850" font-family="Arial" font-size="120" font-weight="bold" text-anchor="middle" fill="white">$</text>
</svg>`;

const splashSVG = `<svg width="1284" height="2778" viewBox="0 0 1284 2778" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1284" height="2778" fill="#6366F1"/>
  <circle cx="642" cy="1389" r="200" fill="white" opacity="0.9"/>
  <text x="642" y="1439" font-family="Arial" font-size="180" font-weight="bold" text-anchor="middle" fill="#6366F1">$</text>
  <text x="642" y="1600" font-family="Arial" font-size="60" font-weight="600" text-anchor="middle" fill="white">Uruguahorra</text>
</svg>`;

// Crear archivos temporales (Expo los convertirá automáticamente)
fs.writeFileSync(path.join(__dirname, 'icon.svg'), iconSVG);
fs.writeFileSync(path.join(__dirname, 'splash.svg'), splashSVG);

// Crear versiones PNG básicas como placeholder
// En producción, usa herramientas apropiadas para generar PNGs desde SVG

const createPlaceholderPNG = (filename, size) => {
  // Crear un archivo PNG placeholder mínimo
  const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const IHDR = Buffer.concat([
    Buffer.from('IHDR'),
    Buffer.from([0, 0, size/256, size%256]), // width
    Buffer.from([0, 0, size/256, size%256]), // height
    Buffer.from([8, 6, 0, 0, 0]) // bit depth, color type, etc
  ]);
  
  console.log(`Created placeholder for ${filename}`);
};

// Por ahora solo crear los archivos SVG
console.log('Icon SVG files created. Use an online converter or image editor to create PNG versions.');
console.log('Recommended: https://cloudconvert.com/svg-to-png');
console.log('Or install sharp: npm install sharp --save-dev');