import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { resolveWebOrigin } from './auth/cors-origin.js'
import { isBlockedHostedRoute } from './auth/hosted-route-policy.js'
import { isHostedLocalControl } from './auth/production-local-gate.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: [resolveWebOrigin(process.env.WEB_ORIGIN, process.env.NODE_ENV === 'production')] })
  app.use((req: { method?: string; originalUrl?: string; url?: string }, res: { status: (code: number) => { json: (body: object) => void } }, next: () => void) => {
    const path = req.originalUrl ?? req.url ?? ''
    if (isBlockedHostedRoute(req.method ?? '', path, process.env.VERCEL === '1', process.env.MUSHI_HOSTED_MONITOR_READS === 'true')) {
      res.status(503).json({ message: 'Endpoint unavailable in hosted login-only mode' })
      return
    }
    if (isHostedLocalControl(path, process.env.NODE_ENV === 'production')) {
      res.status(503).json({ message: 'Mac-local capability unavailable on hosted API' })
      return
    }
    next()
  })
  const port = Number(process.env.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535')
  }
  await app.listen(port)
}

bootstrap().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
