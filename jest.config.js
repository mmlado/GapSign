module.exports = {
  preset: 'react-native',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@noble/(secp256k1|hashes)|@scure/(bip32|bip39|base)|keycard-sdk)/)',
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '\\.svg': '<rootDir>/__mocks__/svgMock.js',
    '^@noble/hashes/(.+?)(\\.js)?$':
      '<rootDir>/node_modules/@noble/hashes/$1.js',
  },
};
