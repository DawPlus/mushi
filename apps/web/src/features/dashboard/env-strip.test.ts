import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  wmoCodeToKorean,
  pm25ToGrade,
  pm10ToGrade,
  getAirQualityKorean,
  formatKoreanDate,
  uvIndexToGrade,
  formatTimeKorean,
} from './weather-labels'
import {
  fetchSeoulWeather,
  fetchSeoulAirQuality,
  fetchSeoulEnv,
  SEOUL_COORDINATES,
} from './open-meteo'
import {
  parseHolidaySummary,
  fetchKrHolidays,
  getTodayDateString,
  type NagerPublicHoliday,
} from './holidays'
import {
  indicatorToKorean,
  fetchSingleServiceStatus,
  fetchAllServicesStatus,
} from './service-status'
import {
  getMoodLines,
  getRandomMoodLine,
  DEFAULT_MOOD_LINES,
} from './mood-line'

test('wmoCodeToKorean converts WMO codes to Korean labels', () => {
  assert.equal(wmoCodeToKorean(0), '맑음')
  assert.equal(wmoCodeToKorean(1), '대체로 맑음')
  assert.equal(wmoCodeToKorean(2), '구름 조금')
  assert.equal(wmoCodeToKorean(3), '흐림')
  assert.equal(wmoCodeToKorean(45), '안개')
  assert.equal(wmoCodeToKorean(61), '약한 비')
  assert.equal(wmoCodeToKorean(63), '비')
  assert.equal(wmoCodeToKorean(71), '약한 눈')
  assert.equal(wmoCodeToKorean(95), '뇌우')
  assert.equal(wmoCodeToKorean(999), '정보 없음')
  assert.equal(wmoCodeToKorean(null), '정보 없음')
  assert.equal(wmoCodeToKorean(undefined), '정보 없음')
})

test('pm25ToGrade grades PM2.5 correctly', () => {
  assert.deepEqual(pm25ToGrade(10), { label: '좋음', level: 'good' })
  assert.deepEqual(pm25ToGrade(15), { label: '좋음', level: 'good' })
  assert.deepEqual(pm25ToGrade(16), { label: '보통', level: 'moderate' })
  assert.deepEqual(pm25ToGrade(35), { label: '보통', level: 'moderate' })
  assert.deepEqual(pm25ToGrade(36), { label: '나쁨', level: 'bad' })
  assert.deepEqual(pm25ToGrade(75), { label: '나쁨', level: 'bad' })
  assert.deepEqual(pm25ToGrade(76), { label: '매우나쁨', level: 'very-bad' })
  assert.deepEqual(pm25ToGrade(null), { label: '정보 없음', level: 'unknown' })
})

test('pm10ToGrade grades PM10 correctly', () => {
  assert.deepEqual(pm10ToGrade(20), { label: '좋음', level: 'good' })
  assert.deepEqual(pm10ToGrade(30), { label: '좋음', level: 'good' })
  assert.deepEqual(pm10ToGrade(31), { label: '보통', level: 'moderate' })
  assert.deepEqual(pm10ToGrade(80), { label: '보통', level: 'moderate' })
  assert.deepEqual(pm10ToGrade(81), { label: '나쁨', level: 'bad' })
  assert.deepEqual(pm10ToGrade(150), { label: '나쁨', level: 'bad' })
  assert.deepEqual(pm10ToGrade(151), { label: '매우나쁨', level: 'very-bad' })
  assert.deepEqual(pm10ToGrade(null), { label: '정보 없음', level: 'unknown' })
})

test('uvIndexToGrade grades UV index correctly', () => {
  assert.deepEqual(uvIndexToGrade(1), { label: '낮음', level: 'low' })
  assert.deepEqual(uvIndexToGrade(4.5), { label: '보통', level: 'moderate' })
  assert.deepEqual(uvIndexToGrade(7), { label: '높음', level: 'high' })
  assert.deepEqual(uvIndexToGrade(9), { label: '매우높음', level: 'very-high' })
  assert.deepEqual(uvIndexToGrade(12), { label: '위험', level: 'extreme' })
  assert.deepEqual(uvIndexToGrade(null), { label: '정보 없음', level: 'unknown' })
})

test('formatTimeKorean extracts time part accurately', () => {
  assert.equal(formatTimeKorean('2026-10-11T06:36'), '06:36')
  assert.equal(formatTimeKorean('2026-10-11T18:01:23'), '18:01')
  assert.equal(formatTimeKorean(null), null)
  assert.equal(formatTimeKorean(undefined), null)
})

test('getAirQualityKorean prefers PM2.5 over PM10 and provides combined summary', () => {
  const aq = getAirQualityKorean({ pm2_5: 12, pm10: 45 })
  assert.equal(aq.primaryGrade.label, '좋음')
  assert.equal(aq.pm25Grade.label, '좋음')
  assert.equal(aq.pm10Grade.label, '보통')

  const aqPm10Only = getAirQualityKorean({ pm2_5: null, pm10: 90 })
  assert.equal(aqPm10Only.primaryGrade.label, '나쁨')

  const aqEmpty = getAirQualityKorean(null)
  assert.equal(aqEmpty.primaryGrade.label, '정보 없음')
})

test('formatKoreanDate formats date in Asia/Seoul correctly', () => {
  const date = new Date('2026-10-11T09:33:00Z') // 2026-10-11 18:33:00 KST (Sunday)
  const formatted = formatKoreanDate(date)
  assert.match(formatted, /2026년 10월 11일/)
  assert.match(formatted, /일요일/)
})

test('fetchSeoulWeather fetches and parses forecast with UV and sunrise/sunset', async () => {
  const mockFetch = async (url: string | URL | Request) => {
    const urlStr = url.toString()
    assert.match(urlStr, /^https:\/\/api\.open-meteo\.com\/v1\/forecast/)
    assert.match(urlStr, new RegExp(`latitude=${SEOUL_COORDINATES.latitude}`))
    assert.match(urlStr, new RegExp(`longitude=${SEOUL_COORDINATES.longitude}`))
    assert.match(urlStr, /daily=sunrise%2Csunset%2Cuv_index_max|daily=sunrise,sunset,uv_index_max/)
    assert.match(urlStr, /timezone=Asia%2FSeoul|timezone=Asia\/Seoul/)
    return {
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 18.5,
          apparent_temperature: 17.8,
          weather_code: 1,
          relative_humidity_2m: 55,
          uv_index: 3.2,
        },
        daily: {
          sunrise: ['2026-10-11T06:36'],
          sunset: ['2026-10-11T18:01'],
          uv_index_max: [5.1],
        },
      }),
    } as unknown as Response
  }

  const result = await fetchSeoulWeather(mockFetch as unknown as typeof fetch)
  assert.equal(result.temperature, 18.5)
  assert.equal(result.apparentTemperature, 17.8)
  assert.equal(result.weatherCode, 1)
  assert.equal(result.humidity, 55)
  assert.equal(result.uvIndex, 3.2)
  assert.equal(result.uvIndexMax, 5.1)
  assert.equal(result.sunrise, '2026-10-11T06:36')
  assert.equal(result.sunset, '2026-10-11T18:01')
})

test('fetchSeoulAirQuality fetches and parses air quality correctly', async () => {
  const mockFetch = async (url: string | URL | Request) => {
    const urlStr = url.toString()
    assert.match(urlStr, /^https:\/\/air-quality-api\.open-meteo\.com\/v1\/air-quality/)
    assert.match(urlStr, new RegExp(`latitude=${SEOUL_COORDINATES.latitude}`))
    assert.match(urlStr, new RegExp(`longitude=${SEOUL_COORDINATES.longitude}`))
    return {
      ok: true,
      json: async () => ({
        current: {
          pm2_5: 12.4,
          pm10: 25.1,
          european_aqi: 22,
        },
      }),
    } as unknown as Response
  }

  const result = await fetchSeoulAirQuality(mockFetch as unknown as typeof fetch)
  assert.equal(result.pm2_5, 12.4)
  assert.equal(result.pm10, 25.1)
})

test('fetchSeoulEnv handles partial failure gracefully', async () => {
  const mockFetch = async (url: string | URL | Request) => {
    const urlStr = url.toString()
    if (urlStr.includes('api.open-meteo.com/v1/forecast')) {
      return {
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 20,
            apparent_temperature: 19,
            weather_code: 0,
            relative_humidity_2m: 40,
          },
        }),
      } as unknown as Response
    }
    return {
      ok: false,
      status: 500,
    } as unknown as Response
  }

  const env = await fetchSeoulEnv(mockFetch as unknown as typeof fetch)
  assert.ok(env.weather)
  assert.equal(env.weather?.temperature, 20)
  assert.equal(env.airQuality, null)
})

test('parseHolidaySummary determines today and next holiday correctly', () => {
  const mockHolidays: NagerPublicHoliday[] = [
    {
      date: '2026-01-01',
      localName: '새해',
      name: "New Year's Day",
      countryCode: 'KR',
      fixed: false,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    {
      date: '2026-10-09',
      localName: '한글날',
      name: 'Hangeul Day',
      countryCode: 'KR',
      fixed: false,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    {
      date: '2026-10-11',
      localName: '대체공휴일',
      name: 'Substitute Holiday',
      countryCode: 'KR',
      fixed: false,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    {
      date: '2026-12-25',
      localName: '기독탄신일',
      name: 'Christmas Day',
      countryCode: 'KR',
      fixed: false,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
  ]

  // Case 1: Today is holiday
  const summaryToday = parseHolidaySummary(mockHolidays, '2026-10-11')
  assert.equal(summaryToday.todayHoliday?.localName, '대체공휴일')
  assert.equal(summaryToday.nextHoliday?.holiday.localName, '기독탄신일')
  assert.equal(summaryToday.nextHoliday?.daysUntil, 75)

  // Case 2: Today is not holiday
  const summaryNotHoliday = parseHolidaySummary(mockHolidays, '2026-10-10')
  assert.equal(summaryNotHoliday.todayHoliday, null)
  assert.equal(summaryNotHoliday.nextHoliday?.holiday.localName, '대체공휴일')
  assert.equal(summaryNotHoliday.nextHoliday?.daysUntil, 1)

  // Case 3: Empty holiday list
  const summaryEmpty = parseHolidaySummary([], '2026-10-11')
  assert.equal(summaryEmpty.todayHoliday, null)
  assert.equal(summaryEmpty.nextHoliday, null)
})

test('fetchKrHolidays fetches and parses holidays from Nager.Date API', async () => {
  const mockFetch = async (url: string | URL | Request) => {
    assert.equal(url.toString(), 'https://date.nager.at/api/v3/PublicHolidays/2026/KR')
    return {
      ok: true,
      json: async () => [
        {
          date: '2026-01-01',
          localName: '새해',
          name: "New Year's Day",
          countryCode: 'KR',
          fixed: false,
          global: true,
          counties: null,
          launchYear: null,
          types: ['Public'],
        },
      ],
    } as unknown as Response
  }

  const holidays = await fetchKrHolidays(2026, mockFetch as unknown as typeof fetch)
  assert.equal(holidays.length, 1)
  assert.equal(holidays[0]?.localName, '새해')
})

test('indicatorToKorean maps status indicators to Korean labels', () => {
  assert.deepEqual(indicatorToKorean('none'), { indicator: 'operational', label: '정상' })
  assert.deepEqual(indicatorToKorean('operational'), { indicator: 'operational', label: '정상' })
  assert.deepEqual(indicatorToKorean('minor'), { indicator: 'degraded', label: '일부 저하' })
  assert.deepEqual(indicatorToKorean('degraded'), { indicator: 'degraded', label: '일부 저하' })
  assert.deepEqual(indicatorToKorean('major'), { indicator: 'outage', label: '장애' })
  assert.deepEqual(indicatorToKorean('critical'), { indicator: 'outage', label: '장애' })
  assert.deepEqual(indicatorToKorean('unknown'), { indicator: 'unknown', label: '확인 불가' })
  assert.deepEqual(indicatorToKorean(null), { indicator: 'unknown', label: '확인 불가' })
})

test('fetchSingleServiceStatus handles success and error cases', async () => {
  const target = {
    id: 'test-service',
    name: 'Test Service',
    url: 'https://status.example.com/api/v2/status.json',
  }

  // Success case
  const mockSuccessFetch = async () =>
    ({
      ok: true,
      json: async () => ({
        page: { updated_at: '2026-10-11T09:00:00Z' },
        status: { indicator: 'none', description: 'All Systems Operational' },
      }),
    }) as unknown as Response

  const successStatus = await fetchSingleServiceStatus(target, mockSuccessFetch as unknown as typeof fetch)
  assert.equal(successStatus.indicator, 'operational')
  assert.equal(successStatus.label, '정상')

  // HTTP error case
  const mockHttpErrorFetch = async () =>
    ({
      ok: false,
      status: 502,
    }) as unknown as Response

  const errorStatus = await fetchSingleServiceStatus(target, mockHttpErrorFetch as unknown as typeof fetch)
  assert.equal(errorStatus.indicator, 'unknown')
  assert.equal(errorStatus.label, '확인 불가')

  // Network exception case
  const mockRejectFetch = async () => {
    throw new Error('Failed to fetch')
  }

  const rejectedStatus = await fetchSingleServiceStatus(target, mockRejectFetch as unknown as typeof fetch)
  assert.equal(rejectedStatus.indicator, 'unknown')
  assert.equal(rejectedStatus.label, '확인 불가')
})

test('getTodayDateString returns YYYY-MM-DD format in Asia/Seoul', () => {
  const date = new Date('2026-10-11T09:00:00Z')
  assert.equal(getTodayDateString(date), '2026-10-11')
})

test('fetchAllServicesStatus fetches all targets', async () => {
  const mockFetch = async () =>
    ({
      ok: true,
      json: async () => ({
        page: { updated_at: '2026-10-11T09:00:00Z' },
        status: { indicator: 'none', description: 'All Systems Operational' },
      }),
    }) as unknown as Response

  const statuses = await fetchAllServicesStatus(
    [
      { id: 'srv1', name: 'Service 1', url: 'https://srv1.test' },
      { id: 'srv2', name: 'Service 2', url: 'https://srv2.test' },
    ],
    mockFetch as unknown as typeof fetch,
  )

  assert.equal(statuses.length, 2)
  assert.equal(statuses[0]?.indicator, 'operational')
  assert.equal(statuses[1]?.indicator, 'operational')
})

test('moodLine provides Korean phrases bank', () => {
  const lines = getMoodLines()
  assert.ok(lines.length >= 4)
  assert.equal(lines[0], DEFAULT_MOOD_LINES[0])

  const custom = getMoodLines(['커스텀 문구'])
  assert.deepEqual(custom, ['커스텀 문구'])

  const randomLine = getRandomMoodLine(() => 0)
  assert.equal(randomLine, DEFAULT_MOOD_LINES[0])
})

test('public-data module defines official weather and air quality contracts', async () => {
  const {
    fetchOfficialWeather,
    fetchOfficialAirQuality,
    fetchCustomsFx,
    fetchKospi,
    fetchFinanceSummary,
  } = await import('./public-data')
  assert.equal(typeof fetchOfficialWeather, 'function')
  assert.equal(typeof fetchOfficialAirQuality, 'function')
  assert.equal(typeof fetchCustomsFx, 'function')
  assert.equal(typeof fetchKospi, 'function')
  assert.equal(typeof fetchFinanceSummary, 'function')
})

test('finance-strip component module exports FinanceStrip', async () => {
  const { FinanceStrip } = await import('./finance-strip')
  assert.equal(typeof FinanceStrip, 'function')
})


