export interface NagerPublicHoliday {
  date: string // "YYYY-MM-DD"
  localName: string
  name: string
  countryCode: string
  fixed: boolean
  global: boolean
  counties: string[] | null
  launchYear: number | null
  types: string[]
}

export interface HolidaySummary {
  todayHoliday: NagerPublicHoliday | null
  nextHoliday: {
    holiday: NagerPublicHoliday
    daysUntil: number
  } | null
}

export const NAGER_DATE_BASE_URL = 'https://date.nager.at/api/v3/PublicHolidays'

export function getTodayDateString(date = new Date(), timezone = 'Asia/Seoul'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date) // "YYYY-MM-DD"
}

export function parseHolidaySummary(
  holidays: NagerPublicHoliday[],
  todayStr: string,
): HolidaySummary {
  if (!Array.isArray(holidays) || holidays.length === 0) {
    return { todayHoliday: null, nextHoliday: null }
  }

  const todayHoliday = holidays.find(h => h.date === todayStr) ?? null

  const upcomingHolidays = holidays
    .filter(h => h.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  let nextHoliday: HolidaySummary['nextHoliday'] = null

  if (upcomingHolidays.length > 0) {
    const next = upcomingHolidays[0]!
    const todayMs = Date.parse(`${todayStr}T00:00:00Z`)
    const nextMs = Date.parse(`${next.date}T00:00:00Z`)
    const diffDays = Math.max(1, Math.round((nextMs - todayMs) / (1000 * 60 * 60 * 24)))

    nextHoliday = {
      holiday: next,
      daysUntil: diffDays,
    }
  }

  return {
    todayHoliday,
    nextHoliday,
  }
}

export async function fetchKrHolidays(
  year: number = new Date().getFullYear(),
  customFetch: typeof fetch = fetch,
): Promise<NagerPublicHoliday[]> {
  const url = `${NAGER_DATE_BASE_URL}/${year}/KR`
  const res = await customFetch(url)
  if (!res.ok) {
    throw new Error(`Nager.Date HTTP error: ${res.status}`)
  }

  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Invalid Nager.Date response format')
  }

  return data as NagerPublicHoliday[]
}
