import "reflect-metadata"
import { Module, Controller, Get } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { healthStatus } from "./health.js"

@Controller("health")
class HealthController {
  @Get() health() { return healthStatus() }
}
@Module({ controllers: [HealthController] })
class ApiModule {}

const app = await NestFactory.create(ApiModule)
app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5174" })
await app.listen(Number(process.env.PORT ?? 3001), "127.0.0.1")
// Add a real Supabase owner verifier before any non-health API route.
