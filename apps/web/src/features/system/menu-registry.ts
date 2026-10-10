import { LayoutDashboard, Radio, Server, Terminal, Workflow, Waypoints, FolderGit2 } from 'lucide-react'

/** Shell-owned navigation manifest; remote entries stay disabled until trusted deployment registration. */
export const menuRegistry = [
  { id: 'dashboard', label: '대시보드', href: '/', icon: LayoutDashboard, ready: true },
  { id: 'monitor', label: 'Mac Monitor', href: '/monitor', icon: Server, ready: true },
  { id: 'bridge', label: 'Bridge', href: '/bridge', icon: Radio, ready: true },
  { id: 'services', label: '서비스 관리', href: '/services', icon: Server, ready: false },
  { id: 'terminal', label: '원격 CLI', href: '/terminal', icon: Terminal, ready: true },
  { id: 'projects', label: 'Projects', href: '/projects', icon: FolderGit2, ready: true },
  { id: 'agents', label: 'OpenHarness', href: '/agents', icon: Workflow, ready: true },
  { id: 'automation', label: '자동화 (n8n)', href: '/automation', icon: Waypoints, ready: true },
] as const
