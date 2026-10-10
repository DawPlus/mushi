import { useQuery } from '@tanstack/react-query'
import { ActivityIcon } from '../../components/common'
import { api } from '../../lib/api'
import { StatusChip } from '../monitor/status-chip'

type Health = { status: string }

export function ApiStatus() {
  const health = useQuery({
    queryKey: ['api', 'health'],
    queryFn: () => api.get('health').json<Health>(),
    retry: false,
  })

  const tone = health.isPending ? 'loading'
    : health.isError ? 'error'
    : health.data?.status === 'ok' ? 'online' : 'unknown'
  const label = health.isPending ? 'API 확인 중…'
    : health.isError ? 'API 연결 안 됨'
    : health.data?.status === 'ok' ? 'API 정상' : 'API 확인 필요'

  return (
    <div className="inline-flex items-center gap-2" role="status">
      <ActivityIcon size={16} className="text-primary" aria-hidden="true" />
      <StatusChip tone={tone} label={label} />
    </div>
  )
}
