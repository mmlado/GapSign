module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@noble/(secp256k1|hashes)|keycard-sdk)/)',
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '\\.svg': '<rootDir>/__mocks__/svgMock.js',
    '^@noble/hashes/(.+)$': '<rootDir>/node_modules/@noble/hashes/$1.js',
  },
};
