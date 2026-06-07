import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.native.*', 'node_modules'],
      // Emit the hand-authored `.d.ts` files (e.g. `src/lib/axios.d.ts`) into
      // `dist` so consumers importing names re-exported from `.js` modules
      // (`api`, `configureApi`, `getTenancy`, ...) resolve to real types.
      copyDtsFiles: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        // Electron subpath modules (@rhino-dev/rhino-react/electron[/preload|/renderer]).
        'electron/main': resolve(__dirname, 'src/electron/main.js'),
        'electron/preload': resolve(__dirname, 'src/electron/preload.js'),
        'electron/renderer': resolve(__dirname, 'src/electron/renderer.js'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: (id) => {
        // Externalize all peer dependencies and their sub-imports
        return (
          id === 'react' ||
          id.startsWith('react/') ||
          id === 'react-dom' ||
          id.startsWith('react-dom/') ||
          id === '@tanstack/react-query' ||
          id.startsWith('@tanstack/react-query/') ||
          id === 'axios' ||
          id.startsWith('axios/') ||
          id === 'cogent-js' ||
          id.startsWith('cogent-js/') ||
          id === 'clsx' ||
          id === 'tailwind-merge' ||
          id === '@react-native-async-storage/async-storage'
        );
      },
      output: {
        // Preserve entry names so we get dist/index.js, dist/electron/main.js, etc.
        entryFileNames: '[name].js',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@tanstack/react-query': 'ReactQuery',
          axios: 'axios',
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
