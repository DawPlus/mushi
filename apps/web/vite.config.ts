import { defineConfig, loadEnv } from 'vite'
import { parseBuildRemotes, federationRemotes } from './remote-build-config.ts'
import { remoteRoutesPlugin } from './remote-routes-plugin.ts'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { federation } from '@module-federation/vite'
import { fileURLToPath, URL } from 'node:url'

/** The shell reserves Module Federation for independently deployed external repos. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'MUSHI_')
  const remotes = parseBuildRemotes(env.MUSHI_REMOTE_REGISTRY, env.MUSHI_REMOTE_ALLOWED_ORIGINS)
  return {
  plugins: [
    remoteRoutesPlugin(remotes),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(), tailwindcss(),
    federation({
      name: 'mushi_shell',
      remotes: federationRemotes(remotes),
      shared: ['react', 'react-dom'],
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  ...(mode === 'remote-e2e' ? { preview: { proxy: { '/test-api': { target: 'http://127.0.0.1:3000', changeOrigin: true, rewrite: (path: string) => path.replace(/^\/test-api/, '') } } } } : {}),
  }
})
