import { createRootRoute, Outlet } from '@tanstack/react-router'
import { OwnerLogin } from '../features/system/owner-login'
import { AppShell } from '../features/system/app-shell'

export const Route = createRootRoute({
  component: () => <OwnerLogin><AppShell><Outlet /></AppShell></OwnerLogin>,
})
