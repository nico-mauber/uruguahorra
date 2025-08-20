// Proxy transformer que intercepta y modifica el código antes de procesarlo
const { getDefaultConfig } = require('expo/metro-config');

// Obtener el transformer por defecto
const defaultConfig = getDefaultConfig(__dirname);
const defaultTransformer =
  defaultConfig.transformer?.babelTransformerPath ||
  require.resolve('metro-transform-worker');

module.exports.transform = async function ({ src, filename, options }) {
  // Reemplazar import.meta en TODOS los archivos antes de transformar
  let modifiedSrc = src;

  if (src.includes('import.meta')) {
    // Log para debug
    console.log(`[Transform] Processing import.meta in: ${filename}`);

    // Reemplazar todas las variantes de import.meta
    modifiedSrc = src
      // Reemplazar expresiones condicionales complejas primero
      .replace(
        /\(import\.meta\.env\s*\?\s*import\.meta\.env\.(\w+)\s*:\s*void 0\)/g,
        '(globalThis.__importMeta && globalThis.__importMeta.env ? globalThis.__importMeta.env.$1 : undefined)'
      )
      // Reemplazar accesos directos a propiedades
      .replace(
        /import\.meta\.env\.MODE/g,
        '(globalThis.__importMeta && globalThis.__importMeta.env ? globalThis.__importMeta.env.MODE : "development")'
      )
      .replace(
        /import\.meta\.env\.DEV/g,
        '(globalThis.__importMeta && globalThis.__importMeta.env ? globalThis.__importMeta.env.DEV : true)'
      )
      .replace(
        /import\.meta\.env\.PROD/g,
        '(globalThis.__importMeta && globalThis.__importMeta.env ? globalThis.__importMeta.env.PROD : false)'
      )
      .replace(
        /import\.meta\.env\.BASE_URL/g,
        '(globalThis.__importMeta && globalThis.__importMeta.env ? globalThis.__importMeta.env.BASE_URL : "/")'
      )
      .replace(
        /import\.meta\.env\.SSR/g,
        '(globalThis.__importMeta && globalThis.__importMeta.env ? globalThis.__importMeta.env.SSR : false)'
      )
      // Reemplazar import.meta.env completo
      .replace(
        /import\.meta\.env/g,
        '(globalThis.__importMeta ? globalThis.__importMeta.env : {})'
      )
      // Reemplazar import.meta.url
      .replace(
        /import\.meta\.url/g,
        '(globalThis.__importMeta ? globalThis.__importMeta.url : "http://localhost:8081")'
      )
      // Reemplazar import.meta completo
      .replace(/import\.meta/g, '(globalThis.__importMeta || {})');
  }

  // Cargar y ejecutar el transformer por defecto con el código modificado
  const transformer = require(defaultTransformer);
  return transformer.transform({
    src: modifiedSrc,
    filename,
    options,
  });
};
