import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

// En mode Tauri, TAURI_ENV_TARGET_TRIPLE est injecté par le CLI Tauri
const isTauri = !!process.env.TAURI_ENV_TARGET_TRIPLE;

export default defineConfig({
  plugins: [solidPlugin()],

  server: {
    port: 1420,
    strictPort: true,
    // Permet à Tauri de se connecter en dev
    host: isTauri ? 'localhost' : true,
  },

  build: {
    target: isTauri ? ['es2021', 'chrome105', 'safari13'] : 'esnext',
    outDir: 'dist',
    // En mode Tauri on ne veut pas de minification des sourcemaps pour debug
    sourcemap: isTauri && process.env.TAURI_ENV_DEBUG === 'true',
  },

  // En mode Tauri, on n'utilise pas de base URL relative
  base: isTauri ? '/' : '/',

  // Variables injectées côté JS
  define: {
    __IS_TAURI__: JSON.stringify(isTauri),
  },
});
