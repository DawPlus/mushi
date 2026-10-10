declare module 'virtual:mushi-remote-routes' {
  import type { RemoteRegistration } from './features/system/remote-registration'
  export const registrations: RemoteRegistration[]
  export const loaders: Record<string, () => Promise<{ default?: import('react').ComponentType }>>
}
