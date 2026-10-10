import type { Plugin } from 'vite'
import type { RemoteRegistration } from './src/features/system/remote-registration'

/** Emit only trusted, build-time Federation imports; no runtime-provided URL or module specifier. */
export function remoteRoutesPlugin(items: readonly RemoteRegistration[]): Plugin {
  const id = '\0virtual:mushi-remote-routes'
  return {
    name: 'mushi-remote-routes',
    enforce: 'pre',
    resolveId(source) { if (source === 'virtual:mushi-remote-routes') return id },
    load(source) {
      if (source !== id) return
      const modules = items.map(item => JSON.stringify(item.id) + ': () => import(' + JSON.stringify(item.id + '/' + item.exposedModule.slice(2)) + ')')
      return 'export const registrations = ' + JSON.stringify(items) + ';\nexport const loaders = {' + modules.join(',') + '};'
    },
  }
}
