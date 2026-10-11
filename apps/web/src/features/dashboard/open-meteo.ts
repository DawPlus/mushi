export const SEOUL_COORDINATES = {
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
} as const

export interface OpenMeteoWeatherData {
  temperature: number
  apparentTemperature: number
  weatherCode: number
  humidity?: number
  uvIndex?: number | null
  uvIndexMax?: number | null
  sunrise?: string | null
  sunset?: string | null
}

export interface OpenMeteoAirQualityData {
  pm2_5: number | null
  pm10: number | null
  europeanAqi?: number | null
}

export interface SeoulEnvData {
  weather: OpenMeteoWeatherData | null
  airQuality: OpenMeteoAirQualityData | null
}

const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast'
const AIR_QUALITY_BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

export async function fetchSeoulWeather(
  customFetch: typeof fetch = fetch,
): Promise<OpenMeteoWeatherData> {
  const url = new URL(FORECAST_BASE_URL)
  url.searchParams.set('latitude', SEOUL_COORDINATES.latitude.toString())
  url.searchParams.set('longitude', SEOUL_COORDINATES.longitude.toString())
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,uv_index',
  )
  url.searchParams.set('daily', 'sunrise,sunset,uv_index_max')
  url.searchParams.set('timezone', SEOUL_COORDINATES.timezone)

  const res = await customFetch(url.toString())
  if (!res.ok) {
    throw new Error(`Open-Meteo forecast HTTP error: ${res.status}`)
  }

  const data = await res.json()
  const current = data?.current
  const daily = data?.daily

  if (!current || typeof current.temperature_2m !== 'number') {
    throw new Error('Invalid Open-Meteo weather response')
  }

  const sunrise = Array.isArray(daily?.sunrise) && daily.sunrise.length > 0 ? daily.sunrise[0] : null
  const sunset = Array.isArray(daily?.sunset) && daily.sunset.length > 0 ? daily.sunset[0] : null
  const uvIndexMax = Array.isArray(daily?.uv_index_max) && typeof daily.uv_index_max[0] === 'number'
    ? daily.uv_index_max[0]
    : null

  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature ?? current.temperature_2m,
    weatherCode: current.weather_code ?? 0,
    humidity: current.relative_humidity_2m,
    uvIndex: typeof current.uv_index === 'number' ? current.uv_index : null,
    uvIndexMax,
    sunrise,
    sunset,
  }
}

export async function fetchSeoulAirQuality(
  customFetch: typeof fetch = fetch,
): Promise<OpenMeteoAirQualityData> {
  const url = new URL(AIR_QUALITY_BASE_URL)
  url.searchParams.set('latitude', SEOUL_COORDINATES.latitude.toString())
  url.searchParams.set('longitude', SEOUL_COORDINATES.longitude.toString())
  url.searchParams.set('current', 'pm2_5,pm10,european_aqi')

  const res = await customFetch(url.toString())
  if (!res.ok) {
    throw new Error(`Open-Meteo air-quality HTTP error: ${res.status}`)
  }

  const data = await res.json()
  const current = data?.current

  if (!current) {
    throw new Error('Invalid Open-Meteo air quality response')
  }

  return {
    pm2_5: typeof current.pm2_5 === 'number' ? current.pm2_5 : null,
    pm10: typeof current.pm10 === 'number' ? current.pm10 : null,
    europeanAqi: typeof current.european_aqi === 'number' ? current.european_aqi : null,
  }
}

export async function fetchSeoulEnv(
  customFetch: typeof fetch = fetch,
): Promise<SeoulEnvData> {
  const [weatherResult, airQualityResult] = await Promise.allSettled([
    fetchSeoulWeather(customFetch),
    fetchSeoulAirQuality(customFetch),
  ])

  return {
    weather: weatherResult.status === 'fulfilled' ? weatherResult.value : null,
    airQuality: airQualityResult.status === 'fulfilled' ? airQualityResult.value : null,
  }
}
