export const SIDEBAR_STORAGE_KEY = 'mushi-sidebar-open'
export const SIDEBAR_WIDTH_PX = 240

export function readSidebarOpen(stored: string | null, desktopDefault = true): boolean {
  if (stored === '1' || stored === 'true') return true
  if (stored === '0' || stored === 'false') return false
  return desktopDefault
}

export function writeSidebarOpen(open: boolean) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? '1' : '0')
  } catch {
    /* private mode / blocked storage */
  }
}

export function readStoredSidebarOpen(): string | null {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY)
  } catch {
    return null
  }
}
