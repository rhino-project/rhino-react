import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// These checks assert that the build emits the hand-authored `.d.ts` files
// (via `copyDtsFiles` in vite.config.js) so consumers importing names that are
// re-exported from `.js` modules (`api`, `configureApi`, `getTenancy`, ...)
// resolve to real types.
//
// They only run after a build has produced `dist/`. When `dist/` is absent
// (e.g. `vitest` before `npm run build`) the checks are skipped so the unit
// suite stays runnable on its own — `npm run build` is the gate that proves it.
const distDir = resolve(__dirname, '../../dist');
const hasDist = existsSync(distDir);
const maybe = hasDist ? describe : describe.skip;

maybe('dist hand-written .d.ts emission', () => {
  it('emits dist/lib/axios.d.ts', () => {
    expect(existsSync(resolve(distDir, 'lib/axios.d.ts'))).toBe(true);
  });

  it('dist/lib/axios.d.ts declares api / configureApi / getTenancy', () => {
    const src = readFileSync(resolve(distDir, 'lib/axios.d.ts'), 'utf8');
    expect(src).toContain('configureApi');
    expect(src).toContain('getTenancy');
    expect(src).toContain('declare const api');
  });
});
