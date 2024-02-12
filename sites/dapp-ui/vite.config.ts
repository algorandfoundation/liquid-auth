import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import {rename} from 'node:fs/promises'
import {resolve} from 'node:path'
import { mkdirp } from 'mkdirp';

const API_DIR = resolve(__dirname, '..', '..', 'services', 'liquid-auth-api-js')
const PUBLIC_DIR = resolve(API_DIR, 'public')
const VIEW_DIR = resolve(API_DIR, 'views')
console.log(API_DIR)
export default defineConfig({
    build:{
      outDir: PUBLIC_DIR,
    },
    plugins: [react(),
      {
      name: 'move-index-file',
      closeBundle: async () => {
        await mkdirp(VIEW_DIR)
       try{
         await rename(resolve(PUBLIC_DIR, 'index.html'), resolve(VIEW_DIR, 'index.html'))
       } catch (e) {
         console.log('Skipping')
       }

      }
    },
    ],
})
