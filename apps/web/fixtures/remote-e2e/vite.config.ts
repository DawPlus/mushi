import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('.', import.meta.url))
const https = { key: readFileSync(new URL('./local.key', import.meta.url)), cert: readFileSync(new URL('./local.crt', import.meta.url)) }
export default defineConfig({
  root,
  plugins: [react(), federation({ name: 'mushi_test', filename: 'remoteEntry.js', exposes: { './Feature': './src/Feature.tsx' }, shared: ['react', 'react-dom'] })],
  server: { host: 'localhost', port: 3903, strictPort: true, https, cors: true },
  preview: { host: 'localhost', port: 3903, strictPort: true, https, cors: true },
  build: { target: 'esnext', outDir: 'dist', emptyOutDir: true },
})
