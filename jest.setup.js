/* eslint-env jest */
// Suppress console.log during tests. Errors and warnings are still shown.
jest.spyOn(console, 'log').mockImplementation(() => {});

// Clear any pending fake timers between tests to prevent bleed-over.
afterEach(() => {
  jest.clearAllTimers();
});
