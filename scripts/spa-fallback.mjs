// Replit's static deployment serves `dist/` verbatim with no SPA rewrite.
// Copy index.html → 404.html so deep links like /relationships/people/abc
// return 200 with the SPA shell instead of a hard 404.

import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const src = resolve(dist, 'index.html');
const dst = resolve(dist, '404.html');

if (!existsSync(src)) {
  console.error('[spa-fallback] dist/index.html missing — did vite build run?');
  process.exit(1);
}
copyFileSync(src, dst);
console.log('[spa-fallback] wrote dist/404.html');
