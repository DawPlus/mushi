const STORAGE_KEY = 'onion-bridge.activeWorkspace'

export type StoredWorkspace = {
  path: string
  name: string
}

export function readStoredWorkspace(): StoredWorkspace | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredWorkspace
    if (!parsed?.path || typeof parsed.path !== 'string') return null
    return {
      path: parsed.path,
      name:
        typeof parsed.name === 'string' && parsed.name
          ? parsed.name
          : parsed.path.split('/').filter(Boolean).pop() || parsed.path,
    }
  } catch {
    return null
  }
}

export function writeStoredWorkspace(workspace: StoredWorkspace | null) {
  try {
    if (!workspace) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  } catch {
    // ignore quota / private mode
  }
}

export function workspaceBasename(path: string) {
  return path.split('/').filter(Boolean).pop() || path
}

export function projectInWorkspace(
  project: { path: string; root?: string | null },
  workspacePath: string,
) {
  if (!workspacePath) return false
  if (project.root && project.root === workspacePath) return true
  if (project.path === workspacePath) return true
  return project.path.startsWith(`${workspacePath}/`)
}
