/**
 * Babel plugin para transformar import.meta en React Native/Expo
 * Transforma import.meta a globalThis.__importMeta para compatibilidad
 */

module.exports = function (babel) {
  const { types: t } = babel;

  return {
    name: 'transform-import-meta',
    visitor: {
      MetaProperty(path) {
        // Si encontramos import.meta, lo reemplazamos con globalThis.__importMeta
        if (
          path.node.meta.name === 'import' &&
          path.node.property.name === 'meta'
        ) {
          path.replaceWith(
            t.memberExpression(
              t.identifier('globalThis'),
              t.identifier('__importMeta')
            )
          );
        }
      },
      
      // También manejar accesos a propiedades de import.meta como import.meta.url
      MemberExpression(path) {
        if (
          t.isMetaProperty(path.node.object) &&
          path.node.object.meta.name === 'import' &&
          path.node.object.property.name === 'meta'
        ) {
          // Reemplazar import.meta.propName con globalThis.__importMeta.propName
          path.node.object = t.memberExpression(
            t.identifier('globalThis'),
            t.identifier('__importMeta')
          );
        }
      },
    },
  };
};