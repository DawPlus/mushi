import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { verifyBridgeBearer } from './bridge-auth.js'
import { ManagedProcessRegistry, registerTools } from './tools.js'

export type BridgeHttpRequest = IncomingMessage & {
  body?: unknown
  headers: IncomingMessage['headers'] & { authorization?: string; 'mcp-session-id'?: string | string[] }
}

export type BridgeHttpResponse = ServerResponse & {
  status(code: number): BridgeHttpResponse
  json(body: unknown): void
  headersSent: boolean
}

type BridgeSession = {
  server: McpServer
  transport: StreamableHTTPServerTransport
}

export type BridgeServiceOptions = {
  /** Small explicit cap on concurrent MCP sessions; excess initialize requests are rejected. */
  maxSessions?: number
}

/** Default concurrent Bridge MCP session cap. */
export const DEFAULT_MAX_BRIDGE_SESSIONS = 8

@Injectable()
export class BridgeService {
  private activeRoot: string | null = null
  private readonly sessions = new Map<string, BridgeSession>()
  readonly processes = new ManagedProcessRegistry()
  private readonly maxSessions: number

  constructor(options: BridgeServiceOptions = {}) {
    this.maxSessions = options.maxSessions ?? DEFAULT_MAX_BRIDGE_SESSIONS
  }

  isActive(): boolean {
    return this.activeRoot !== null
  }

  getActiveWorkspace(): string | null {
    return this.activeRoot
  }

  sessionCount(): number {
    return this.sessions.size
  }

  /** Activate a single local workspace for MCP. Control API (T-261010-17) owns selection. */
  async activate(workspacePath: string): Promise<void> {
    const real = await fs.realpath(workspacePath)
    const stat = await fs.stat(real)
    if (!stat.isDirectory()) throw new Error('Workspace path is not a directory.')
    await this.clearSessions()
    await this.processes.stopAll()
    this.activeRoot = real
  }

  async deactivate(): Promise<void> {
    await this.clearSessions()
    await this.processes.stopAll()
    this.activeRoot = null
  }

  async handleMcp(req: BridgeHttpRequest, res: BridgeHttpResponse): Promise<void> {
    if (!verifyBridgeBearer(req.headers.authorization)) {
      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Missing or invalid bearer token.',
      })
      return
    }

    if (!this.activeRoot) {
      res.status(409).json({ error: 'Bridge workspace is inactive.' })
      return
    }

    const sessionHeader = req.headers['mcp-session-id']
    const sessionId = typeof sessionHeader === 'string' ? sessionHeader : undefined

    try {
      if (sessionId && this.sessions.has(sessionId)) {
        const existing = this.sessions.get(sessionId)!
        await existing.transport.handleRequest(req, res, req.body)
        return
      }

      if (sessionId && !this.sessions.has(sessionId)) {
        res.status(404).json({ error: 'Session not found.' })
        return
      }

      if (this.sessions.size >= this.maxSessions) {
        res.status(429).json({ error: 'Bridge MCP session limit reached.' })
        return
      }

      const root = this.activeRoot
      const server = this.createMcp(root)
      let sessionRegistered = false
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (id) => {
          sessionRegistered = true
          this.sessions.set(id, { server, transport })
        },
        onsessionclosed: (id) => {
          this.sessions.delete(id)
        },
      })

      try {
        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
        if (!sessionRegistered) {
          await this.closeSessionResources(server, transport)
        }
      } catch (error) {
        await this.closeSessionResources(server, transport)
        throw error
      }
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: 'MCP request failed' })
      }
    }
  }

  private createMcp(root: string) {
    const server = new McpServer(
      { name: 'mushi-bridge', version: '0.1.0' },
      {
        instructions: 'Authenticated workspace MCP server for the active Mushi Bridge workspace.',
      },
    )
    registerTools(server, root, this.processes)
    return server
  }

  private async closeSessionResources(
    server: McpServer,
    transport: StreamableHTTPServerTransport,
  ): Promise<void> {
    try {
      await transport.close()
    } catch {
      /* ignore */
    }
    try {
      await server.close()
    } catch {
      /* ignore */
    }
  }

  private async clearSessions(): Promise<void> {
    const closing = [...this.sessions.values()].map(async (session) => {
      await this.closeSessionResources(session.server, session.transport)
    })
    this.sessions.clear()
    await Promise.all(closing)
  }
}

/** Process-local singleton; Nest ESM DI does not reliably inject constructors here. */
export const bridgeService = new BridgeService()
