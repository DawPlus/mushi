import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service.js";

@Module({
	providers: [AuthService],
	exports: [AuthService],
})
export class AuthModule {}
