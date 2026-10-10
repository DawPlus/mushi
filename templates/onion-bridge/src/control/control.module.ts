import { Module } from "@nestjs/common";

/**
 * Nest shell for the web control API.
 * Routes still live on the Express app from createControlApp;
 * this module is the attachment point for future Auth/guards.
 */
@Module({})
export class ControlModule {}
