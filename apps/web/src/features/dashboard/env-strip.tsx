import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  CalendarDays,
  CloudSun,
  Droplets,
  PartyPopper,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from 'lucide-react'
import {
  AppAuroraText,
  AppHyperText,
  AppNumberTicker,
  AppShinyText,
  AppWordRotate,
} from '../../components/common'
import { cn } from '../../lib/utils'
import {
  fetchSeoulAirQuality,
  fetchSeoulWeather,
  type OpenMeteoAirQualityData,
  type OpenMeteoWeatherData,
} from './open-meteo'
import {
  fetchOfficialAirQuality,
  fetchOfficialWeather,
  type OfficialAirQualityDto,
  type OfficialWeatherDto,
} from './public-data'
import {
  fetchKrHolidays,
  getTodayDateString,
  parseHolidaySummary,
  type HolidaySummary,
} from './holidays'
import {
  fetchAllServicesStatus,
  type MonitoredServiceStatus,
} from './service-status'
import { FinanceStrip } from './finance-strip'
import {
  formatKoreanDate,
  formatTimeKorean,
  getAirQualityKorean,
  uvIndexToGrade,
  wmoCodeToKorean,
  type AirQualityLevel,
} from './weather-labels'

const aqLevelBadgeClasses: Record<AirQualityLevel, string> = {
  good: 'border-success/35 bg-success/15 text-success',
  moderate: 'border-primary/35 bg-primary/12 text-primary',
  bad: 'border-warning/40 bg-warning/15 text-warning-foreground',
  'very-bad': 'border-destructive/40 bg-destructive/15 text-destructive',
  unknown: 'border-border/70 bg-muted text-muted-foreground',
}

const statusIndicatorClasses: Record<string, string> = {
  operational: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  degraded: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
  outage: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
  unknown: 'bg-muted/70 border-border/70 text-muted-foreground',
}

const statusDotClasses: Record<string, string> = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  outage: 'bg-rose-500',
  unknown: 'bg-muted-foreground',
}

interface EnvStripProps {
  className?: string
}

export function EnvStrip({ className }: EnvStripProps) {
  const currentDate = formatKoreanDate()
  const todayStr = getTodayDateString()
  const currentYear = new Date().getFullYear()

  // 1. Weather Query: Official KMA first, Open-Meteo fallback
  const weatherQuery = useQuery<
    | { type: 'official'; data: OfficialWeatherDto; om?: OpenMeteoWeatherData | null }
    | { type: 'open-meteo'; data: OpenMeteoWeatherData }
  >({
    queryKey: ['dashboard', 'weather', 'seoul', 'v2'],
    queryFn: async () => {
      // Fetch Open-Meteo as baseline/supplement (for UV, sunrise, sunset)
      const omPromise = fetchSeoulWeather().catch(() => null)
      try {
        const official = await fetchOfficialWeather()
        const om = await omPromise
        return { type: 'official', data: official, om }
      } catch {
        const om = await omPromise
        if (om) return { type: 'open-meteo', data: om }
        throw new Error('Both official and Open-Meteo weather failed')
      }
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  })

  // 2. Air Quality Query: Official AirKorea first, Open-Meteo fallback
  const airQualityQuery = useQuery<
    | { type: 'official'; data: OfficialAirQualityDto }
    | { type: 'open-meteo'; data: OpenMeteoAirQualityData }
  >({
    queryKey: ['dashboard', 'air-quality', 'seoul', 'v2'],
    queryFn: async () => {
      try {
        const official = await fetchOfficialAirQuality()
        return { type: 'official', data: official }
      } catch {
        const om = await fetchSeoulAirQuality()
        return { type: 'open-meteo', data: om }
      }
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  })

  // 3. Holidays Query (Nager.Date KR)
  const holidayQuery = useQuery<HolidaySummary>({
    queryKey: ['dashboard', 'holidays', 'kr', currentYear],
    queryFn: async () => {
      const list = await fetchKrHolidays(currentYear)
      return parseHolidaySummary(list, todayStr)
    },
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  })

  // 4. Service Status Query (GitHub, OpenAI, Cloudflare)
  const serviceStatusQuery = useQuery<MonitoredServiceStatus[]>({
    queryKey: ['dashboard', 'service-status'],
    queryFn: () => fetchAllServicesStatus(),
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 15,
    retry: 1,
  })

  const weatherState = weatherQuery.data
  const weather = weatherState
    ? weatherState.type === 'official'
      ? {
          temperature: weatherState.data.temperature,
          apparentTemperature: weatherState.om?.apparentTemperature ?? weatherState.data.temperature,
          weatherLabel: weatherState.data.weatherLabel,
          humidity: weatherState.data.humidity ?? weatherState.om?.humidity,
          uvIndex: weatherState.om?.uvIndex ?? null,
          sunrise: weatherState.om?.sunrise ?? null,
          sunset: weatherState.om?.sunset ?? null,
          sourceBadge: '기상청 공식',
        }
      : {
          temperature: weatherState.data.temperature,
          apparentTemperature: weatherState.data.apparentTemperature,
          weatherLabel: wmoCodeToKorean(weatherState.data.weatherCode),
          humidity: weatherState.data.humidity,
          uvIndex: weatherState.data.uvIndex ?? null,
          sunrise: weatherState.data.sunrise ?? null,
          sunset: weatherState.data.sunset ?? null,
          sourceBadge: null,
        }
    : null

  const uvGrade = weather?.uvIndex != null ? uvIndexToGrade(weather.uvIndex) : null
  const sunriseTime = formatTimeKorean(weather?.sunrise)
  const sunsetTime = formatTimeKorean(weather?.sunset)

  const airQualityState = airQualityQuery.data
  const aqSummary = airQualityState
    ? airQualityState.type === 'official'
      ? {
          primaryGrade: {
            label: airQualityState.data.primaryGradeLabel,
            level: airQualityState.data.primaryLevel,
          },
          pm2_5: airQualityState.data.pm25Value,
          pm10: airQualityState.data.pm10Value,
          stationName: airQualityState.data.stationName,
          sourceBadge: '에어코리아 공식',
        }
      : {
          ...getAirQualityKorean(airQualityState.data),
          stationName: '서울',
          sourceBadge: null,
        }
    : null

  const holidaySummary = holidayQuery.data
  const serviceStatuses = serviceStatusQuery.data

  const isInitialLoading = weatherQuery.isPending && airQualityQuery.isPending
  const hasWeatherError = weatherQuery.isError
  const hasAirQualityError = airQualityQuery.isError

  return (
    <section
      aria-label="오늘 요약"
      className={cn(
        'relative grid gap-4 rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur-xl sm:p-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-primary/25 bg-primary/12 text-primary">
            <CalendarDays size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-primary uppercase">
              <AppWordRotate
                words={['오늘 요약', 'Today', '한눈에']}
                duration={3000}
                as="span"
                className="text-[11px] font-medium tracking-[0.14em] text-primary"
              />
            </p>
            <p className="font-mushi text-xl leading-tight font-medium tracking-tight text-foreground sm:text-2xl">
              {currentDate}
            </p>
          </div>
        </div>
        {holidaySummary && (
          <div className="flex flex-wrap items-center gap-2">
            {holidaySummary.todayHoliday && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                <PartyPopper size={13} aria-hidden="true" />
                오늘 {holidaySummary.todayHoliday.localName}
              </span>
            )}
            {holidaySummary.nextHoliday && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                다음 {holidaySummary.nextHoliday.holiday.localName}
                <span className="text-primary">D-{holidaySummary.nextHoliday.daysUntil}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {isInitialLoading ? (
        <div className="flex items-center gap-2 px-1 py-6 text-sm text-muted-foreground">
          <RefreshCw size={15} className="animate-spin text-primary" aria-hidden="true" />
          <span>요약 불러오는 중…</span>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative flex min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-background/40 p-3.5">
            {hasWeatherError || !weather ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CloudSun size={15} aria-hidden="true" />
                날씨 확인 불가
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    <AppHyperText as="span" className="text-[11px] tracking-wide" duration={700}>
                      서울 날씨
                    </AppHyperText>
                  </p>
                  <CloudSun size={14} className="text-primary" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">
                      <AppNumberTicker value={Math.round(weather.temperature)} />
                      <span className="ml-0.5 text-sm font-medium text-muted-foreground">°C</span>
                    </p>
                    <p className="text-sm text-foreground">
                      <AppAuroraText className="text-sm">{weather.weatherLabel}</AppAuroraText>
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Thermometer size={11} aria-hidden="true" />
                      체감 {Math.round(weather.apparentTemperature)}°
                    </span>
                    {typeof weather.humidity === 'number' && (
                      <span className="inline-flex items-center gap-1">
                        <Droplets size={11} aria-hidden="true" />
                        {weather.humidity}%
                      </span>
                    )}
                    {uvGrade && uvGrade.level !== 'unknown' && (
                      <span className="inline-flex items-center gap-1">
                        <Sun size={11} aria-hidden="true" />
                        UV {uvGrade.label}
                      </span>
                    )}
                    {sunriseTime && (
                      <span className="inline-flex items-center gap-1">
                        <Sunrise size={11} aria-hidden="true" />
                        {sunriseTime}
                      </span>
                    )}
                    {sunsetTime && (
                      <span className="inline-flex items-center gap-1">
                        <Sunset size={11} aria-hidden="true" />
                        {sunsetTime}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative flex min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-background/40 p-3.5">
            {hasAirQualityError || !aqSummary ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wind size={15} aria-hidden="true" />
                미세먼지 확인 불가
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    <AppHyperText as="span" className="text-[11px] tracking-wide" duration={700} delay={80}>
                      {`미세먼지${aqSummary.stationName ? ` · ${aqSummary.stationName}` : ''}`}
                    </AppHyperText>
                  </p>
                  <Wind size={14} className="text-primary" aria-hidden="true" />
                </div>
                <div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-lg border px-2 py-0.5 text-base font-semibold',
                      aqLevelBadgeClasses[aqSummary.primaryGrade.level],
                    )}
                  >
                    {aqSummary.primaryGrade.label}
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                    {aqSummary.pm2_5 !== null && <span>PM2.5 {Math.round(aqSummary.pm2_5)}</span>}
                    {aqSummary.pm10 !== null && <span>PM10 {Math.round(aqSummary.pm10)}</span>}
                  </div>
                </div>
              </>
            )}
          </div>

          <FinanceStrip embedded />
        </div>
      )}

      {serviceStatuses && serviceStatuses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Activity size={13} className="text-primary" aria-hidden="true" />
            <AppShinyText>서비스</AppShinyText>
          </span>
          {serviceStatuses.map(service => (
            <span
              key={service.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                statusIndicatorClasses[service.indicator] ?? statusIndicatorClasses.unknown,
              )}
              title={service.description || service.label}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  statusDotClasses[service.indicator] ?? statusDotClasses.unknown,
                )}
                aria-hidden="true"
              />
              {service.name}
              <span className="opacity-80">{service.label}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
