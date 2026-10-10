import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { resolveWebOrigin } from './auth/cors-origin.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: [resolveWebOrigin(process.env.WEB_ORIGIN, process.env.NODE_ENV === 'production')] })
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
