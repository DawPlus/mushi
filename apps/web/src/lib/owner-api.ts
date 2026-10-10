import { getOwnerAccessToken } from '../features/system/owner-login'
import { ownerHttpErrorMessage } from './owner-http-errors'

export { ownerHttpErrorMessage } from './owner-http-errors'

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export async function ownerRequest<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const token = await getOwnerAccessToken()
  if (!token) throw new Error('로그인 세션이 만료됐습니다.')
  const endpoint = new URL(base)
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/' ||
    (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)))) {
    throw new Error('API 주소 설정을 확인해 주세요.')
  }
  const response = await fetch(new URL(path, endpoint), {
    method: options.method ?? 'GET',
    headers: { Authorization: 'Bearer ' + token, ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(ownerHttpErrorMessage(response.status))
  return response.json() as Promise<T>
}
