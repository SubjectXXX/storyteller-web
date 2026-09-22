/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Application/web is owned by S0-T03 and later player-side tasks.
// It must NOT import from application/admin or any sibling app.
// Shared tokens come from @storyteller/design-system.

// Vite 8 ships with rolldown types; Vitest 3 ships with vite 7 (rollup).
// The two plugin shapes differ at the type level. Cast the plugin tuple to
// satisfy the env-specific overlay. The runtime behaviour of @vitejs/plugin-react
// is identical against both builds.
export default defineConfig({
  // Vite emits asset URLs with this prefix so the bundled
  // <script src="/web/assets/..."> + <link href="/web/assets/...">
  // resolve against the gateway, which strips /web via the
  // handle_path /web/* Caddy route before forwarding to this
  // container. The player SPA itself is mounted at /web and
  // reached via http://localhost:8088/web.
  base: '/web/',
  plugins: [react({})] as any,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    // Forward `/api/*`, `/health`, `/up`, and Sanctum endpoints to the local
    // Caddy gateway, which itself routes `/api/*` to the Laravel API. In the
    // docker-compose stack the gateway is reachable on the host as
    // `localhost:8088`; this proxy lets `vite dev` make live API calls
    // without spinning up the container stack.
    proxy: {
      '/api': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      '/up': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      '/sanctum': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
