import { DataGoKrClient } from './data-go-kr.client.js'

export type AirQualityLevel = 'good' | 'moderate' | 'bad' | 'very-bad' | 'unknown'

export interface NormalizedAirKoreaDto {
  stationName: string
  dataTime: string
  pm25Value: number | null
  pm25GradeLabel: string
  pm25Level: AirQualityLevel
  pm10Value: number | null
  pm10GradeLabel: string
  pm10Level: AirQualityLevel
  primaryGradeLabel: string
  primaryLevel: AirQualityLevel
  source: 'airkorea'
}

export interface AirKoreaRawItem {
  stationName?: string
  dataTime?: string
  pm25Value?: string
  pm25Grade?: string
  pm10Value?: string
  pm10Grade?: string
  o3Value?: string
  o3Grade?: string
  khaiGrade?: string
  khaiValue?: string
}

function parseGrade(gradeCode?: string): { label: string; level: AirQualityLevel } {
  switch (gradeCode) {
    case '1':
      return { label: '좋음', level: 'good' }
    case '2':
      return { label: '보통', level: 'moderate' }
    case '3':
      return { label: '나쁨', level: 'bad' }
    case '4':
      return { label: '매우나쁨', level: 'very-bad' }
    default:
      return { label: '정보 없음', level: 'unknown' }
  }
}

export function parseAirKoreaQuality(item: AirKoreaRawItem): NormalizedAirKoreaDto {
  const pm25Val = item.pm25Value ? parseFloat(item.pm25Value) : null
  const pm10Val = item.pm10Value ? parseFloat(item.pm10Value) : null

  const pm25Grade = parseGrade(item.pm25Grade)
  const pm10Grade = parseGrade(item.pm10Grade)

  // Primary grade prioritizes PM2.5, falls back to PM10
  const primaryGrade = pm25Grade.level !== 'unknown' ? pm25Grade : pm10Grade

  return {
    stationName: item.stationName ?? '서울',
    dataTime: item.dataTime ?? '',
    pm25Value: Number.isNaN(pm25Val) ? null : pm25Val,
    pm25GradeLabel: pm25Grade.label,
    pm25Level: pm25Grade.level,
    pm10Value: Number.isNaN(pm10Val) ? null : pm10Val,
    pm10GradeLabel: pm10Grade.label,
    pm10Level: pm10Grade.level,
    primaryGradeLabel: primaryGrade.label,
    primaryLevel: primaryGrade.level,
    source: 'airkorea',
  }
}

export async function fetchSeoulAirKoreaQuality(
  client: DataGoKrClient,
): Promise<NormalizedAirKoreaDto> {
  const endpoint = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty'

  const data = await client.fetchJson<{
    response?: {
      header?: { resultCode: string; resultMsg: string }
      body?: {
        items?: AirKoreaRawItem[]
      }
    }
  }>(endpoint, {
    returnType: 'json',
    numOfRows: 40,
    pageNo: 1,
    sidoName: '서울',
    ver: '1.0',
  })

  const header = data?.response?.header
  if (header?.resultCode && header.resultCode !== '00') {
    throw new Error(`AirKorea API error: ${header.resultMsg} (${header.resultCode})`)
  }

  const items = data?.response?.body?.items
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Empty AirKorea response')
  }

  // Find '중구' (central Seoul representative station) or use the first item
  const representative = items.find(i => i.stationName === '중구') ?? items[0]
  return parseAirKoreaQuality(representative)
}
