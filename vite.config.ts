import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: { port: 3000, host: '0.0.0.0' },
      plugins: [
        react(), basicSsl(),
        VitePWA({
          registerType: 'autoUpdate',
          workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'], runtimeCaching: [{ urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i, handler: 'CacheFirst', options: { cacheName: 'osm-tiles-cache', expiration: { maxEntries: 2000, maxAgeSeconds: 2592000 }, cacheableResponse: { statuses: [0, 200] } } }, { urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i, handler: 'CacheFirst', options: { cacheName: 'supabase-images-cache', expiration: { maxEntries: 500, maxAgeSeconds: 604800 }, cacheableResponse: { statuses: [0, 200] } } }] },
          manifest: { name: 'PlantEye', short_name: 'PlantEye', description: 'Diagnóstico Silvícola', theme_color: '#064E3B', background_color: '#064E3B', display: 'standalone', start_url: '/', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] }
        })
      ],
      define: { 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY), 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY), 'process.env.GEMINI_API_KEYS': JSON.stringify(env.GEMINI_API_KEYS || '') },
      resolve: { alias: { '@': path.resolve(__dirname, '.') } }
    };
});