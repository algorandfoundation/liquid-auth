import 'dotenv/config'
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

const DEFAULT_PROXY_URL = 'http://localhost:3000';
const DEFAULT_WSS_PROXY_URL = 'ws://localhost:3000';

export default defineConfig({
  server: {
    proxy: {
        '^/auth/.*': process.env.PROXY_URL || DEFAULT_PROXY_URL,
        '^/.well-known/.*': process.env.PROXY_URL || DEFAULT_PROXY_URL,
        '^/connect/.*': process.env.PROXY_URL || DEFAULT_PROXY_URL,
        '^/attestation/.*': process.env.PROXY_URL || DEFAULT_PROXY_URL,
        '^/assertion/.*': process.env.PROXY_URL || DEFAULT_PROXY_URL,
        '/socket.io': {
            target: process.env.WSS_PROXY_SERVER || DEFAULT_WSS_PROXY_URL,
            ws: true,
        },
    }
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
  ],
});
