import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
