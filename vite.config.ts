import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { applyStaticSeoToHtml, PUBLIC_PAGE_SEO } from './src/lib/seo';

function seoStaticShells(): Plugin {
  return {
    name: 'seo-static-shells',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      const indexPath = path.join(dist, 'index.html');
      if (!fs.existsSync(indexPath)) return;
      const indexHtml = fs.readFileSync(indexPath, 'utf8');
      for (const page of PUBLIC_PAGE_SEO) {
        if (page.path === '/') continue;
        const dir = path.join(dist, page.path.replace(/^\//, ''));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, 'index.html'),
          applyStaticSeoToHtml(indexHtml, page)
        );
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        // Sem autoUpdate + skipWaiting agressivo: no atalho instalado isso
        // ativava SW novo e piscava/travava a home (rodapé).
        registerType: 'prompt',
        injectRegister: false,
        workbox: {
          clientsClaim: false,
          skipWaiting: false,
          cleanupOutdatedCaches: true,
          importScripts: ['/push-sw.js'],
        },
        includeAssets: [
          'favicon.png',
          'apple-touch-icon.png',
          'mask-icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'push-sw.js',
        ],
        manifest: {
          name: 'DELPHOS — Eventos beneficentes',
          short_name: 'DELPHOS',
          description: 'Eventos beneficentes do Instituto Delphos: programação, ingressos e doações.',
          theme_color: '#051529',
          background_color: '#f9fafb',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      }),
      seoStaticShells(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
