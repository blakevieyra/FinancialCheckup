import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.operone2i.financialcheckup',
  appName: 'Financial Checkup',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0a0f1a',
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0a0f1a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0f1a',
    },
  },
};

export default config;
