import { LayoutDashboard, NotebookPen, Bookmark, Newspaper, BriefcaseBusiness } from 'lucide-react'

/** Web-only navigation. Local tools remain outside the hosted menu. */
export const menuRegistry = [
  { id: 'dashboard', label: '대시보드', href: '/dashboard', icon: LayoutDashboard, ready: true },
  { id: 'notes', label: '게시판 / 메모', href: '/notes', icon: NotebookPen, ready: true },
  { id: 'bookmarks', label: '북마크', href: '/bookmarks', icon: Bookmark, ready: true },
  { id: 'news', label: '뉴스', href: '/news', icon: Newspaper, ready: true },
  { id: 'opportunities', label: '기회 탐색', href: '/opportunities', icon: BriefcaseBusiness, ready: true },
] as const
