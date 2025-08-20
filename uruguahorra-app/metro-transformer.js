// Transformer personalizado para Metro que maneja import.meta
const upstreamTransformer = require('@expo/metro-config/build/transform-worker/metro-transform-worker');

module.exports.transform = async function (props) {
  // Reemplazar import.meta en el código fuente antes de transformar
  if (props.src && props.src.includes('import.meta')) {
    props.src = props.src
      .replace(/import\.meta\.url/g, '"http://localhost:8081"')
      .replace(/import\.meta\.env\.MODE/g, '"development"')
      .replace(/import\.meta\.env\.DEV/g, 'true')
      .replace(/import\.meta\.env\.PROD/g, 'false')
      .replace(/import\.meta\.env\.BASE_URL/g, '"/"')
      .replace(/import\.meta\.env\.SSR/g, 'false')
      .replace(
        /import\.meta\.env/g,
        '{"MODE":"development","DEV":true,"PROD":false,"BASE_URL":"/","SSR":false}'
      )
      .replace(
        /import\.meta/g,
        '{"url":"http://localhost:8081","env":{"MODE":"development","DEV":true,"PROD":false,"BASE_URL":"/","SSR":false}}'
      );
  }

  // Llamar al transformer original
  return upstreamTransformer.transform(props);
};
