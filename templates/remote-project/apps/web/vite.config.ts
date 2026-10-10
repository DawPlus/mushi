import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig({
  plugins: [react(), federation({
    name: 'mushi_sample',
    filename: 'remoteEntry.js',
    exposes: { './Feature': './src/Feature.tsx' },
    shared: ['react', 'react-dom'],
  })],
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
})
