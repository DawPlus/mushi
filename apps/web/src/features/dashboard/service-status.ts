export type ServiceIndicator = 'operational' | 'degraded' | 'outage' | 'unknown'

export interface MonitoredServiceStatus {
  id: string
  name: string
  indicator: ServiceIndicator
  label: string // 한글 상태 라벨 ("정상", "일부 저하", "장애", "확인 불가")
  description: string
  updatedAt: string | null
}

export interface MonitoredServiceTarget {
  id: string
  name: string
  url: string
}

// Hardcoded safe public status hosts only
export const MONITORED_SERVICES: readonly MonitoredServiceTarget[] = [
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://www.githubstatus.com/api/v2/status.json',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    url: 'https://status.openai.com/api/v2/status.json',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    url: 'https://www.cloudflarestatus.com/api/v2/status.json',
  },
] as const

export function indicatorToKorean(indicator: string | null | undefined): {
  indicator: ServiceIndicator
  label: string
} {
  switch (indicator?.toLowerCase()) {
    case 'none':
    case 'operational':
      return { indicator: 'operational', label: '정상' }
    case 'minor':
    case 'degraded':
      return { indicator: 'degraded', label: '일부 저하' }
    case 'major':
    case 'critical':
    case 'outage':
      return { indicator: 'outage', label: '장애' }
    default:
      return { indicator: 'unknown', label: '확인 불가' }
  }
}

export async function fetchSingleServiceStatus(
  target: MonitoredServiceTarget,
  customFetch: typeof fetch = fetch,
): Promise<MonitoredServiceStatus> {
  try {
    const res = await customFetch(target.url, {
      headers: {
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      return {
        id: target.id,
        name: target.name,
        indicator: 'unknown',
        label: '확인 불가',
        description: `HTTP ${res.status}`,
        updatedAt: null,
      }
    }
    const data = await res.json()
    const rawIndicator = data?.status?.indicator
    const rawDescription = data?.status?.description ?? ''
    const rawUpdatedAt = data?.page?.updated_at ?? null

    const parsed = indicatorToKorean(rawIndicator)

    return {
      id: target.id,
      name: target.name,
      indicator: parsed.indicator,
      label: parsed.label,
      description: rawDescription,
      updatedAt: rawUpdatedAt,
    }
  } catch (err) {
    return {
      id: target.id,
      name: target.name,
      indicator: 'unknown',
      label: '확인 불가',
      description: err instanceof Error ? err.message : '네트워크 오류',
      updatedAt: null,
    }
  }
}

export async function fetchAllServicesStatus(
  targets: readonly MonitoredServiceTarget[] = MONITORED_SERVICES,
  customFetch: typeof fetch = fetch,
): Promise<MonitoredServiceStatus[]> {
  const promises = targets.map(target => fetchSingleServiceStatus(target, customFetch))
  return Promise.all(promises)
}
