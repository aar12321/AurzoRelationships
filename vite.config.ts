import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Guard: refuse to produce a production bundle without Supabase credentials.
// Vite inlines `import.meta.env.VITE_*` at build time, so a missing value at
// `vite build` silently ships `undefined` to the browser and every request
// fails with "Failed to fetch". Failing the build makes the deploy log loud.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (command === 'build') {
    const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const missing: string[] = [];
    if (!url) missing.push('VITE_SUPABASE_URL');
    if (!key) missing.push('VITE_SUPABASE_ANON_KEY');
    if (missing.length) {
      throw new Error(
        `\n[aurzo] Refusing to build — missing env vars: ${missing.join(', ')}.\n` +
        '  On Replit: open the Secrets panel (🔒) and add them, then re-publish.\n' +
        '  Locally: copy .env.example to .env and fill in the values.\n',
      );
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      // Replit fronts the dev server with a *.replit.dev / *.repl.co proxy;
      // Vite's host-header check must be relaxed or every request 403s.
      allowedHosts: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      allowedHosts: true,
    },
  };
});
