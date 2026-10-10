import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common'

type Counter = { hits: number; expiresAt: number }
const counters = new Map<string, Counter>()
const WINDOW_MS = 60_000
const MAX_TRACKED = 4096

/** Local per-process burst control. Production multi-instance deployments need a shared limiter. */
@Injectable()
export class BurstLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      ip?: string
      socket?: { remoteAddress?: string }
      method?: string
      originalUrl?: string
      url?: string
    }>()
    const pathname = (req.originalUrl ?? req.url ?? '').split('?')[0]
    const jobsPath = /^\/owner\/cli-jobs(?:\/[0-9a-f-]{36}(?:\/cancel)?)?$/.test(pathname)
    const projectsPath = /^\/owner\/projects(?:\/[a-z0-9-]{2,40}\/remove)?$/.test(pathname)
    const bridgePath = /^\/owner\/bridge(?:\/(?:start|stop|start-directory|pick-workspace|folders|projects|project-flag|dev-action|tunnel-action|configuration))?$/.test(pathname)
    const agentPath = /^\/owner\/mac-agent\/(?:status|start|stop)$/.test(pathname)
    const sensitive = pathname === '/auth/owner' || jobsPath || projectsPath || bridgePath || agentPath || /^\/(?:owner\/)?devices\/[^/]+\/heartbeat$/.test(pathname)
    if (!sensitive) return true
    const now = Date.now()
    if (counters.size >= MAX_TRACKED) {
      for (const [key, value] of counters) if (value.expiresAt <= now) counters.delete(key)
      if (counters.size >= MAX_TRACKED) throw new HttpException('Too many requests; try again later', HttpStatus.TOO_MANY_REQUESTS)
    }
    // Do not trust user-provided X-Forwarded-For without an explicit trusted-proxy configuration.
    const identity = req.socket?.remoteAddress ?? req.ip ?? 'unknown'
    const kind = pathname.startsWith('/auth/') ? 'auth' : jobsPath ? 'cli-jobs' : projectsPath ? 'projects' : bridgePath ? 'bridge' : 'heartbeat'
    const key = identity + ':' + req.method + ':' + kind
    const limit = kind === 'auth' ? 30 : 120
    const previous = counters.get(key)
    const counter = !previous || previous.expiresAt <= now
      ? { hits: 1, expiresAt: now + WINDOW_MS }
      : { hits: previous.hits + 1, expiresAt: previous.expiresAt }
    counters.set(key, counter)
    if (counter.hits > limit) throw new HttpException('Too many requests; try again later', HttpStatus.TOO_MANY_REQUESTS)
    return true
  }
}
