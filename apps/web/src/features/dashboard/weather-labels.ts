export type AirQualityLevel = 'good' | 'moderate' | 'bad' | 'very-bad' | 'unknown'

export interface AirQualityGrade {
  label: string
  level: AirQualityLevel
}

/**
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
export function wmoCodeToKorean(code: number | null | undefined): string {
  if (code === null || code === undefined) {
    return '정보 없음'
  }

  switch (code) {
    case 0:
      return '맑음'
    case 1:
      return '대체로 맑음'
    case 2:
      return '구름 조금'
    case 3:
      return '흐림'
    case 45:
      return '안개'
    case 48:
      return '착빙성 안개'
    case 51:
      return '가벼운 이슬비'
    case 53:
      return '이슬비'
    case 55:
      return '강한 이슬비'
    case 56:
    case 57:
      return '동결성 이슬비'
    case 61:
      return '약한 비'
    case 63:
      return '비'
    case 65:
      return '강한 비'
    case 66:
    case 67:
      return '얼어붙는 비'
    case 71:
      return '약한 눈'
    case 73:
      return '눈'
    case 75:
      return '강한 눈'
    case 77:
      return '싸락눈'
    case 80:
      return '약한 소나기'
    case 81:
      return '소나기'
    case 82:
      return '강한 소나기'
    case 85:
      return '약한 눈 소나기'
    case 86:
      return '강한 눈 소나기'
    case 95:
      return '뇌우'
    case 96:
    case 99:
      return '우박을 동반한 뇌우'
    default:
      return '정보 없음'
  }
}

/**
 * PM2.5 기준 (WHO/한국 기준 근사)
 * ≤15 좋음 / ≤35 보통 / ≤75 나쁨 / >75 매우나쁨
 */
export function pm25ToGrade(value: number | null | undefined): AirQualityGrade {
  if (value === null || value === undefined || Number.isNaN(value) || value < 0) {
    return { label: '정보 없음', level: 'unknown' }
  }
  if (value <= 15) {
    return { label: '좋음', level: 'good' }
  }
  if (value <= 35) {
    return { label: '보통', level: 'moderate' }
  }
  if (value <= 75) {
    return { label: '나쁨', level: 'bad' }
  }
  return { label: '매우나쁨', level: 'very-bad' }
}

/**
 * PM10 기준 (WHO/한국 기준 근사)
 * ≤30 좋음 / ≤80 보통 / ≤150 나쁨 / >150 매우나쁨
 */
export function pm10ToGrade(value: number | null | undefined): AirQualityGrade {
  if (value === null || value === undefined || Number.isNaN(value) || value < 0) {
    return { label: '정보 없음', level: 'unknown' }
  }
  if (value <= 30) {
    return { label: '좋음', level: 'good' }
  }
  if (value <= 80) {
    return { label: '보통', level: 'moderate' }
  }
  if (value <= 150) {
    return { label: '나쁨', level: 'bad' }
  }
  return { label: '매우나쁨', level: 'very-bad' }
}

export interface AirQualitySummary {
  primaryGrade: AirQualityGrade
  pm25Grade: AirQualityGrade
  pm10Grade: AirQualityGrade
  pm2_5: number | null
  pm10: number | null
}

export function getAirQualityKorean(
  data: { pm2_5?: number | null; pm10?: number | null } | null | undefined,
): AirQualitySummary {
  const pm25Val = data?.pm2_5 ?? null
  const pm10Val = data?.pm10 ?? null

  const pm25Grade = pm25ToGrade(pm25Val)
  const pm10Grade = pm10ToGrade(pm10Val)

  // PM2.5 우선, 없으면 PM10 사용
  const primaryGrade = pm25Grade.level !== 'unknown' ? pm25Grade : pm10Grade

  return {
    primaryGrade,
    pm25Grade,
    pm10Grade,
    pm2_5: pm25Val,
    pm10: pm10Val,
  }
}

/**
 * UV index 등급
 * 0-2 낮음, 3-5 보통, 6-7 높음, 8-10 매우높음, 11+ 위험
 */
export function uvIndexToGrade(uv: number | null | undefined): { label: string; level: 'low' | 'moderate' | 'high' | 'very-high' | 'extreme' | 'unknown' } {
  if (uv === null || uv === undefined || Number.isNaN(uv) || uv < 0) {
    return { label: '정보 없음', level: 'unknown' }
  }
  if (uv < 3) return { label: '낮음', level: 'low' }
  if (uv < 6) return { label: '보통', level: 'moderate' }
  if (uv < 8) return { label: '높음', level: 'high' }
  if (uv < 11) return { label: '매우높음', level: 'very-high' }
  return { label: '위험', level: 'extreme' }
}

/**
 * ISO 시간 문자열(예: "2026-10-11T06:36")을 한국어 시:분 형식으로 변환
 * "06:36" 또는 "오전 6:36"
 */
export function formatTimeKorean(isoString: string | null | undefined): string | null {
  if (!isoString) return null
  try {
    const parts = isoString.split('T')
    if (parts.length >= 2) {
      const timePart = parts[1]?.slice(0, 5)
      if (timePart) return timePart
    }
    const d = new Date(isoString)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    }
  } catch {
    // fallback
  }
  return null
}

/**
 * 오늘 날짜 (Asia/Seoul)
 * 예: 2026년 10월 11일 일요일
 */
export function formatKoreanDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  return formatter.format(date)
}

