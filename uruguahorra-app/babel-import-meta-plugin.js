// Plugin personalizado para transformar import.meta
module.exports = function () {
  return {
    name: 'transform-import-meta-custom',
    visitor: {
      MemberExpression(path) {
        const node = path.node;

        // Verificar si es import.meta
        if (
          node.object &&
          node.object.type === 'MetaProperty' &&
          node.object.meta.name === 'import' &&
          node.object.property.name === 'meta'
        ) {
          // Reemplazar import.meta con el polyfill global
          path.replaceWithSourceString('(globalThis.__importMeta || {})');
        }

        // También manejar casos donde import.meta es el objeto completo
        if (
          node.object &&
          node.object.type === 'MetaProperty' &&
          node.object.meta.name === 'import' &&
          node.object.property.name === 'meta'
        ) {
          const propertyName = node.property.name;

          switch (propertyName) {
            case 'url':
              path.replaceWithSourceString(
                '(globalThis.__importMeta?.url || window.location.href)'
              );
              break;
            case 'env':
              path.replaceWithSourceString(
                '(globalThis.__importMeta?.env || {})'
              );
              break;
            default:
              path.replaceWithSourceString(
                `(globalThis.__importMeta?.${propertyName})`
              );
          }
        }
      },

      MetaProperty(path) {
        const node = path.node;

        // Verificar si es import.meta directo
        if (node.meta.name === 'import' && node.property.name === 'meta') {
          path.replaceWithSourceString('(globalThis.__importMeta || {})');
        }
      },
    },
  };
};
