import { defineConfig, splitVendorChunkPlugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import react from '@vitejs/plugin-react-swc';
import { rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { mkdirp } from 'mkdirp';

const API_DIR = resolve(
  __dirname,
  '..',
  '..',
  'services',
  'liquid-auth-api-js',
);
const PUBLIC_DIR = resolve(API_DIR, 'public');
const VIEW_DIR = resolve(API_DIR, 'views');
console.log(API_DIR);
export default defineConfig({
  // base: '/app',
  server: {
    hmr: {
      port: 8000,
      host: 'localhost',
    },
    // proxy: {
    //     '^/auth/.*': 'http://localhost:3000',
    //     '^/connect/.*': 'http://localhost:3000',
    //     '^/attestation/.*': 'http://localhost:3000',
    //     '^/assertion/.*': 'http://localhost:3000',
    //     '/socket.io': {
    //         target: 'ws://localhost:3000',
    //         ws: true,
    //     },
    // }
  },
  build: {
    // rollupOptions: {
    //     output: {
    //         manualChunks: {
    //             // 'algorand': ['tweetnacl', 'algosdk'],
    //             'socket.io': ['socket.io-client'],
    //             'react': ['react', 'react-dom', '@tanstack/react-query'],
    //             'material': ['@mui/material', '@mui/icons-material']
    //         }
    //     }
    // },
    outDir: PUBLIC_DIR,
  },
  resolve: {
    alias: {
      '@/components': resolve(__dirname, 'src', 'components'),
      '@/hooks': resolve(__dirname, 'src', 'hooks'),
      '@/pages': resolve(__dirname, 'src', 'pages'),
      '@/store': resolve(__dirname, 'src', 'store'),
    },
  },
  plugins: [
    VitePWA({
      includeAssets: [
        'logo-background.svg',
        'apple-touch-icon.png',
        'maskable-icon.png',
      ],
      workbox: {
        navigateFallback: null,
      },
      manifest: {
        name: 'Liquid dApp',
        short_name: 'Liquid',
        description: 'FIDO2/Passkey Authentication',
        theme_color: '#121212',
        icons: [
          {
            src: 'icons/48x48.png',
            sizes: '48x48',
            type: 'image/png',
          },
          {
            src: 'icons/72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: 'icons/96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: 'icons/144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: 'icons/192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
    splitVendorChunkPlugin(),
    ViteImageOptimizer(),
    react(),
    {
      name: 'move-index-file',
      closeBundle: async () => {
        await mkdirp(VIEW_DIR);
        try {
          await rename(
            resolve(PUBLIC_DIR, 'index.html'),
            resolve(VIEW_DIR, 'index.html'),
          );
        } catch (e) {
          console.log('Skipping');
        }
      },
    },
  ],
});
