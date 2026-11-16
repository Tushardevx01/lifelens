// Minimal in-memory AsyncStorage mock for the node:test runner.
// The package's bundled Jest mock depends on a global `jest` object.
const store = new Map();

const asyncStorageMock = {
  getItem: async (key) => (store.has(key) ? store.get(key) : null),
  setItem: async (key, value) => {
    store.set(key, String(value));
  },
  removeItem: async (key) => {
    store.delete(key);
  },
  clear: async () => {
    store.clear();
  },
  getAllKeys: async () => Array.from(store.keys()),
  multiGet: async (keys) => keys.map((key) => [key, store.has(key) ? store.get(key) : null]),
  multiSet: async (pairs) => {
    pairs.forEach(([key, value]) => store.set(key, String(value)));
  },
  multiRemove: async (keys) => {
    keys.forEach((key) => store.delete(key));
  },
};

export default asyncStorageMock;
