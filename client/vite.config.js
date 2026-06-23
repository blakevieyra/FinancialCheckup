import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const capacitorStub = path.resolve(__dirname, 'src/stubs/capacitor-stub.js');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isMobileShell = env.VITE_CAPACITOR === 'true' || process.env.VITE_CAPACITOR === 'true';
  /** If your API listens on another port/host, set e.g. VITE_PROXY_TARGET=http://localhost:3000 */
  const apiTarget = env.VITE_PROXY_TARGET || 'http://localhost:3001';

  return {
    plugins: [react()],
    resolve: {
      alias: isMobileShell
        ? {}
        : {
            '@capacitor/core': capacitorStub,
            '@capacitor/app': capacitorStub,
            '@capacitor/splash-screen': capacitorStub,
            '@capacitor/status-bar': capacitorStub,
          },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
