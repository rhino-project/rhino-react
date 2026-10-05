import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Optional peer, not installed here: tests of storage.native.js get a fake.
      '@react-native-async-storage/async-storage': fileURLToPath(
        new URL('./src/__tests__/helpers/asyncStorageFake.js', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/types/**',           // Type-only files (no runtime code)
        'src/lib/storage.native.js', // Requires React Native AsyncStorage
        'src/lib/events.native.js',  // Already tested via events.native.test.js but exclude RN-only path
      ],
    },
  },
});
