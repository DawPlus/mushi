import { ServiceUnavailableException } from '@nestjs/common'

export const DATA_GO_KR_HOST = 'apis.data.go.kr'

export interface DataGoKrClientOptions {
  serviceKey?: string
  fetchFn?: typeof fetch
}

export class DataGoKrClient {
  private serviceKey: string
  private fetchFn: typeof fetch

  constructor(options: DataGoKrClientOptions = {}) {
    this.serviceKey = (options.serviceKey ?? process.env.DATA_GO_KR_SERVICE_KEY ?? '').trim()
    this.fetchFn = options.fetchFn ?? fetch
  }

  assertConfigured(): string {
    if (!this.serviceKey) {
      throw new ServiceUnavailableException('DATA_GO_KR_SERVICE_KEY is not configured')
    }
    return this.serviceKey
  }

  async fetchJson<T = any>(
    targetUrl: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    const text = await this.fetchText(targetUrl, params)
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`Failed to parse public-data JSON response: ${text.slice(0, 100)}`)
    }
  }

  async fetchText(
    targetUrl: string,
    params: Record<string, string | number>,
  ): Promise<string> {
    const key = this.assertConfigured()

    const parsed = new URL(targetUrl)
    if (parsed.hostname !== DATA_GO_KR_HOST) {
      throw new Error(`Disallowed public-data host: ${parsed.hostname}`)
    }

    parsed.searchParams.set('serviceKey', key)
    for (const [k, v] of Object.entries(params)) {
      parsed.searchParams.set(k, String(v))
    }

    try {
      const res = await this.fetchFn(parsed.toString(), {
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        throw new Error(`Upstream public-data error: HTTP ${res.status}`)
      }
      return await res.text()
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : String(err)
      // Never echo or leak the service key
      const sanitized = msg.replaceAll(key, '[REDACTED]')
      throw new Error(sanitized)
    }
  }
}

