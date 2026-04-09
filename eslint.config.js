const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends('@react-native'),
  {
    ignores: ['node_modules/**', 'android/**', 'ios/**'],
  },
];
