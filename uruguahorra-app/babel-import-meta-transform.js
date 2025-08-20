module.exports = function () {
  return {
    visitor: {
      MetaProperty(path) {
        if (
          path.node.meta.name === 'import' &&
          path.node.property.name === 'meta'
        ) {
          // Reemplazar import.meta con un objeto compatible
          path.replaceWithSourceString(
            '(typeof globalThis !== "undefined" && globalThis.__importMeta) || {}'
          );
        }
      },
    },
  };
};
