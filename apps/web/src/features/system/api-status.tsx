import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

type Health = { status: string }

export function ApiStatus() {
  const health = useQuery({
    queryKey: ['api', 'health'],
    queryFn: () => api.get('health').json<Health>(),
    retry: false,
  })

  if (health.isPending) return <p role="status">API 연결 확인 중…</p>
  if (health.isError) return <p role="status">API 연결 안 됨</p>
  return <p role="status">API 연결: {health.data.status === 'ok' ? '정상' : '확인 필요'}</p>
}
