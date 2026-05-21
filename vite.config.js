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
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@rhino-project/rhino-react',
      formats: ['es'],
      fileName: () => 'index.js',
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
