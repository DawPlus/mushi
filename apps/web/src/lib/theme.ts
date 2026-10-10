export const THEME_STORAGE_KEY = 'mushi-theme'

export type ThemeMode = 'light' | 'dark'

type ClassRoot = {
  classList: {
    toggle: (token: string, force?: boolean) => void
  }
}

export function resolveTheme(stored: string | null, prefersDark: boolean): ThemeMode {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}

export function nextTheme(mode: ThemeMode): ThemeMode {
  return mode === 'dark' ? 'light' : 'dark'
}

export function applyTheme(mode: ThemeMode, root: ClassRoot = document.documentElement) {
  root.classList.toggle('dark', mode === 'dark')
}

export function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeStoredTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    /* private mode / blocked storage */
  }
}

export function systemPrefersDark() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function bootstrapTheme() {
  const mode = resolveTheme(readStoredTheme(), systemPrefersDark())
  applyTheme(mode)
  return mode
}
