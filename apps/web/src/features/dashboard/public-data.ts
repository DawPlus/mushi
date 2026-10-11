import { ownerRequest } from '../../lib/owner-api'
import type { AirQualityLevel } from './weather-labels'

export interface OfficialWeatherDto {
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

export interface OfficialAirQualityDto {
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

export async function fetchOfficialWeather(): Promise<OfficialWeatherDto> {
  return ownerRequest<OfficialWeatherDto>('owner/public-data/weather')
}

export async function fetchOfficialAirQuality(): Promise<OfficialAirQualityDto> {
  return ownerRequest<OfficialAirQualityDto>('owner/public-data/air-quality')
}

export interface OfficialCustomsFxDto {
  currencyCode: string
  currencyName: string
  rate: number
  rateFormatted: string
  applyBeginDate: string
  rateType: 'import' | 'export'
  rateTypeLabel: string
  label: string
  source: 'customs'
}

export interface OfficialKospiDto {
  name: string
  closingPrice: number
  closingPriceFormatted: string
  changeVsYesterday: number
  fluctuationRate: number
  fluctuationRateFormatted: string
  baseDate: string
  source: 'fsc-index'
}

export interface OfficialFinanceDto {
  customsFx: OfficialCustomsFxDto | null
  kospi: OfficialKospiDto | null
  errors?: {
    customsFx?: string
    kospi?: string
  }
}

export async function fetchCustomsFx(): Promise<OfficialCustomsFxDto> {
  return ownerRequest<OfficialCustomsFxDto>('owner/public-data/fx')
}

export async function fetchKospi(): Promise<OfficialKospiDto> {
  return ownerRequest<OfficialKospiDto>('owner/public-data/kospi')
}

export async function fetchFinanceSummary(): Promise<OfficialFinanceDto> {
  return ownerRequest<OfficialFinanceDto>('owner/public-data/finance')
}

