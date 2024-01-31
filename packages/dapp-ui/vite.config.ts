import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import {rename} from 'node:fs/promises'
import {resolve} from 'node:path'
import { mkdirp } from 'mkdirp';
// https://vitejs.dev/config/

const API_DIR = resolve(__dirname, '../avicennia-api')
const PUBLIC_DIR = resolve(API_DIR, 'public')
const VIEW_DIR = resolve(API_DIR, 'views')

export default defineConfig({
    build:{
      outDir: PUBLIC_DIR,
    },
    plugins: [react(),   {
      name: 'move-index-file',
      closeBundle: async () => {
        await mkdirp(PUBLIC_DIR)
        await mkdirp(VIEW_DIR)
        await rename(resolve(PUBLIC_DIR, 'index.html'), resolve(VIEW_DIR, 'index.html'))
      }
    },],
})
