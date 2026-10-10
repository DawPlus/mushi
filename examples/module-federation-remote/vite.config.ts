import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'federation_sample',
      filename: 'remoteEntry.js',
      exposes: { './Feature': './src/Feature.tsx' },
      shared: ['react', 'react-dom'],
    }),
  ],
  server: { host: 'localhost', port: 3903, strictPort: true, cors: true },
  preview: { host: 'localhost', port: 3903, strictPort: true, cors: true },
  build: { target: 'esnext' },
})
