module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      ['babel-preset-expo', {
        web: {
          unstable_transformProfile: 'hermes-stable'
        }
      }]
    ],
    plugins: [
      // Custom plugin to transform import.meta for compatibility
      './babel-import-meta-transform.js'
    ]
  };
};