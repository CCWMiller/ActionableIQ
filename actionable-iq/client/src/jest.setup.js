// Global polyfills for TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock jwt-decode manually
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn((token) => {
    if (token === 'valid-token') {
      return {
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/profile.jpg',
        sub: '123456789',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour in the future
      };
    }
    if (token === 'expired-token') {
      return {
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/profile.jpg',
        sub: '123456789',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
      };
    }
    throw new Error('Invalid token');
  }),
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    store: {},
    getItem(key) {
      return this.store[key] || null;
    },
    setItem(key, value) {
      this.store[key] = value.toString();
    },
    removeItem(key) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    }
  },
  configurable: true
});