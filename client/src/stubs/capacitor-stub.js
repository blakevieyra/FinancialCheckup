/** No-op stubs so the web build works before Capacitor packages are installed. */
export const Capacitor = {
  isNativePlatform: () => false,
  Plugins: {},
};

export const App = {
  addListener: () => ({ remove: () => {} }),
  minimizeApp: async () => {},
};

export const SplashScreen = {
  hide: async () => {},
};

export const StatusBar = {
  setStyle: async () => {},
  setBackgroundColor: async () => {},
};

export const Style = { Dark: 'DARK' };
