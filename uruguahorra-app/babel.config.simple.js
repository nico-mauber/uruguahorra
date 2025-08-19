module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    'react-native-reanimated/plugin',
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@features': './src/features',
          '@lib': './src/lib',
          '@store': './src/store',
          '@theme': './src/theme',
        },
      },
    ],
  ],
};
