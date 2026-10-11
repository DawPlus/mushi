import { DataGoKrClient } from './data-go-kr.client.js'

// Seoul Jongno / Jung-gu central grid coordinates for KMA
export const SEOUL_KMA_GRID = {
  nx: 60,
  ny: 127,
} as const

export interface NormalizedKmaWeatherDto {
  temperature: number
  humidity: number | null
  precipitationType: string
  precipitation1Hour: string
  windSpeed: number | null
  weatherLabel: string
  baseDate: string
  baseTime: string
  source: 'kma'
}

export interface KmaNcstItem {
  baseDate?: string
  baseTime?: string
  category: string
  obsrValue: string
  nx?: number
  ny?: number
}

export function parseKmaWeather(items: KmaNcstItem[]): NormalizedKmaWeatherDto {
  let temperature = 0
  let humidity: number | null = null
  let ptyCode = '0'
  let rn1 = '0'
  let windSpeed: number | null = null
  let baseDate = ''
  let baseTime = ''

  for (const item of items) {
    if (item.baseDate) baseDate = item.baseDate
    if (item.baseTime) baseTime = item.baseTime

    switch (item.category) {
      case 'T1H': {
        const val = parseFloat(item.obsrValue)
        if (!Number.isNaN(val)) temperature = val
        break
      }
      case 'REH': {
        const val = parseFloat(item.obsrValue)
        if (!Number.isNaN(val)) humidity = val
        break
      }
      case 'PTY':
        ptyCode = item.obsrValue
        break
      case 'RN1':
        rn1 = item.obsrValue
        break
      case 'WSD': {
        const val = parseFloat(item.obsrValue)
        if (!Number.isNaN(val)) windSpeed = val
        break
      }
    }
  }

  // PTY: 0(없음), 1(비), 2(비/눈), 3(눈), 5(빗방울), 6(빗방울눈날림), 7(눈날림)
  let precipitationType = '없음'
  let weatherLabel = '맑음'

  switch (ptyCode) {
    case '1':
      precipitationType = '비'
      weatherLabel = '비'
      break
    case '2':
      precipitationType = '비/눈'
      weatherLabel = '비/눈'
      break
    case '3':
      precipitationType = '눈'
      weatherLabel = '눈'
      break
    case '5':
      precipitationType = '빗방울'
      weatherLabel = '빗방울'
      break
    case '6':
      precipitationType = '빗방울/눈날림'
      weatherLabel = '빗방울/눈날림'
      break
    case '7':
      precipitationType = '눈날림'
      weatherLabel = '눈날림'
      break
    default:
      precipitationType = '없음'
      weatherLabel = '맑음'
      break
  }

  return {
    temperature,
    humidity,
    precipitationType,
    precipitation1Hour: rn1,
    windSpeed,
    weatherLabel,
    baseDate,
    baseTime,
    source: 'kma',
  }
}

/**
 * Calculates current KMA base_date and base_time.
 * 초단기실황 API는 매시간 40분에 발표됩니다.
 * 40분 이전에는 이전 시간(1시간 전)의 데이터를 요청합니다.
 */
export function getKmaBaseDateTime(now: Date = new Date()): { baseDate: string; baseTime: string } {
  // Asia/Seoul 시간 기준 계산
  const seoulDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const minutes = seoulDate.getMinutes()

  // 40분 이전이면 1시간 전으로 조정
  if (minutes < 40) {
    seoulDate.setHours(seoulDate.getHours() - 1)
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const year = seoulDate.getFullYear()
  const month = pad(seoulDate.getMonth() + 1)
  const day = pad(seoulDate.getDate())
  const hours = pad(seoulDate.getHours())

  return {
    baseDate: `${year}${month}${day}`,
    baseTime: `${hours}00`,
  }
}

export async function fetchSeoulKmaWeather(
  client: DataGoKrClient,
): Promise<NormalizedKmaWeatherDto> {
  const { baseDate, baseTime } = getKmaBaseDateTime()
  const endpoint = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst'

  const data = await client.fetchJson<{
    response?: {
      header?: { resultCode: string; resultMsg: string }
      body?: {
        items?: {
          item?: KmaNcstItem[]
        }
      }
    }
  }>(endpoint, {
    pageNo: 1,
    numOfRows: 20,
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: SEOUL_KMA_GRID.nx,
    ny: SEOUL_KMA_GRID.ny,
  })

  const header = data?.response?.header
  if (header?.resultCode && header.resultCode !== '00') {
    throw new Error(`KMA API error: ${header.resultMsg} (${header.resultCode})`)
  }

  const items = data?.response?.body?.items?.item
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Empty KMA weather response')
  }

  return parseKmaWeather(items)
}
