import { Controller, Get, Headers, ServiceUnavailableException } from '@nestjs/common'
import { Public } from '../auth/public.decorator.js'
import { requireOwnerFromBearer } from '../auth/require-owner.js'
import { DataGoKrClient } from './data-go-kr.client.js'
import { getPublicData } from './persistent-cache.js'
import { fetchSeoulKmaWeather, NormalizedKmaWeatherDto } from './kma-weather.js'
import { fetchSeoulAirKoreaQuality, NormalizedAirKoreaDto } from './airkorea.js'
import { fetchCustomsFx, NormalizedCustomsFxDto } from './customs-fx.js'
import { fetchKospiIndex, NormalizedKospiDto } from './stock-price.js'

export interface FinanceSummaryDto {
  customsFx: NormalizedCustomsFxDto | null
  kospi: NormalizedKospiDto | null
  errors?: {
    customsFx?: string
    kospi?: string
  }
}

let clientInstance: DataGoKrClient | undefined
function getClient(): DataGoKrClient {
  return clientInstance ??= new DataGoKrClient()
}

@Public()
@Controller('owner/public-data')
export class OwnerPublicDataController {
  @Get('weather')
  async getWeather(
    @Headers('authorization') authorization?: string,
  ): Promise<NormalizedKmaWeatherDto> {
    await requireOwnerFromBearer(authorization)
    const client = getClient()
    try {
      return await getPublicData('weather', () => { client.assertConfigured(); return fetchSeoulKmaWeather(client) })
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err
      throw new ServiceUnavailableException('Public data weather unavailable')
    }
  }

  @Get('air-quality')
  async getAirQuality(
    @Headers('authorization') authorization?: string,
  ): Promise<NormalizedAirKoreaDto> {
    await requireOwnerFromBearer(authorization)
    const client = getClient()
    try {
      return await getPublicData('air-quality', () => { client.assertConfigured(); return fetchSeoulAirKoreaQuality(client) })
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err
      throw new ServiceUnavailableException('Public data air-quality unavailable')
    }
  }

  @Get('fx')
  async getCustomsFx(
    @Headers('authorization') authorization?: string,
  ): Promise<NormalizedCustomsFxDto> {
    await requireOwnerFromBearer(authorization)
    const client = getClient()
    try {
      return await getPublicData('fx', () => { client.assertConfigured(); return fetchCustomsFx(client, 'USD') })
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err
      throw new ServiceUnavailableException('Public data fx unavailable')
    }
  }

  @Get('kospi')
  async getKospi(
    @Headers('authorization') authorization?: string,
  ): Promise<NormalizedKospiDto> {
    await requireOwnerFromBearer(authorization)
    const client = getClient()
    try {
      return await getPublicData('kospi', () => { client.assertConfigured(); return fetchKospiIndex(client) })
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err
      throw new ServiceUnavailableException('Public data kospi unavailable')
    }
  }

  @Get('finance')
  async getFinance(
    @Headers('authorization') authorization?: string,
  ): Promise<FinanceSummaryDto> {
    await requireOwnerFromBearer(authorization)

    let customsFx: NormalizedCustomsFxDto | null = null
    let kospi: NormalizedKospiDto | null = null
    const errors: { customsFx?: string; kospi?: string } = {}

    try {
      customsFx = await this.getCustomsFx(authorization)
    } catch (err: any) {
      errors.customsFx = err?.message ?? 'Customs FX unavailable'
    }

    try {
      kospi = await this.getKospi(authorization)
    } catch (err: any) {
      errors.kospi = err?.message ?? 'KOSPI unavailable'
    }

    return {
      customsFx,
      kospi,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    }
  }
}

