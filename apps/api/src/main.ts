import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: [process.env.WEB_ORIGIN ?? 'http://localhost:5173'] })
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
