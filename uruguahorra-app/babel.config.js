module.exports = {
  presets: [
    ['babel-preset-expo', {
      web: {
        unstable_transformProfile: 'hermes-stable'
      }
    }]
  ],
};