const fs = require('fs');
const path = require('path');

// Mapa de reemplazos
const replacements = {
  'const { colors } = useTheme();': 'const { colors } = useTheme();',
  'theme.text\\b': 'colors.text.primary',
  'theme.textSecondary': 'colors.text.secondary', 
  'theme.textTertiary': 'colors.text.tertiary',
  'theme.primary': 'colors.primary',
  'theme.background': 'colors.background',
  'theme.surface': 'colors.surface',
  'theme.border\\b': 'colors.border.primary',
  'theme.error': 'colors.error',
  'theme.success': 'colors.success', 
  'theme.warning': 'colors.warning',
  'theme.card': 'colors.card',
  'theme.info': 'colors.info'
};

// Función para procesar un archivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Aplicar reemplazos
    for (const [search, replace] of Object.entries(replacements)) {
      const regex = new RegExp(search, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, replace);
        modified = true;
      }
    }
    
    // Si se modificó, guardar el archivo
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Actualizado: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
  }
}

// Función para buscar archivos recursivamente
function findTsxFiles(dir) {
  let results = [];
  
  try {
    const list = fs.readdirSync(dir);
    
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursivamente buscar en subdirectorios
        results = results.concat(findTsxFiles(filePath));
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  } catch (error) {
    console.error(`Error leyendo directorio ${dir}:`, error.message);
  }
  
  return results;
}

// Directorio src
const srcDir = path.join(__dirname, 'src');

// Buscar y procesar todos los archivos .tsx y .ts en src
console.log('🔍 Buscando archivos TypeScript/TSX...');
const files = findTsxFiles(srcDir);

console.log(`📁 Encontrados ${files.length} archivos`);
console.log('🔄 Procesando archivos...\n');

// Procesar cada archivo
files.forEach(processFile);

console.log('\n✨ Proceso completado');
