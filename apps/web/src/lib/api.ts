import ky from 'ky'

export function createApiClient(baseUrl: string) {
  return ky.create({ prefix: baseUrl })
}

export const api = createApiClient(import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000')
