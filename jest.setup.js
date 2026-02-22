/* eslint-env jest */
// Suppress console.log during tests. Errors and warnings are still shown.
jest.spyOn(console, 'log').mockImplementation(() => {});
