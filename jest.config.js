module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@noble/secp256k1|keycard-sdk)/)',
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
};
