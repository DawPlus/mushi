import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DataGoKrClient,
  DATA_GO_KR_HOST,
} from '../src/public-data/data-go-kr.client.js'
import {
  parseKmaWeather,
  SEOUL_KMA_GRID,
} from '../src/public-data/kma-weather.js'
import {
  parseAirKoreaQuality,
} from '../src/public-data/airkorea.js'
import {
  OwnerPublicDataController,
} from '../src/public-data/owner-public-data.controller.js'
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'

test('SEOUL_KMA_GRID defines Seoul coordinates constants nx=60, ny=127', () => {
  assert.equal(SEOUL_KMA_GRID.nx, 60)
  assert.equal(SEOUL_KMA_GRID.ny, 127)
})

test('DataGoKrClient throws ServiceUnavailableException when service key is missing', () => {
  const client = new DataGoKrClient({ serviceKey: '' })
  assert.throws(() => client.assertConfigured(), ServiceUnavailableException)
})

test('DataGoKrClient rejects unapproved hosts', async () => {
  const client = new DataGoKrClient({ serviceKey: 'test-key' })
  await assert.rejects(
    async () => client.fetchJson('https://evil.com/api', {}),
    /Disallowed public-data host/,
  )
})

test('DataGoKrClient redacts serviceKey in error messages', async () => {
  const client = new DataGoKrClient({
    serviceKey: 'SECRET_SERVICE_KEY_12345',
    fetchFn: async () => {
      throw new Error('Network error with https://apis.data.go.kr/test?serviceKey=SECRET_SERVICE_KEY_12345')
    },
  })
  try {
    await client.fetchJson(`https://${DATA_GO_KR_HOST}/test`, {})
    assert.fail('Should have thrown')
  } catch (err: any) {
    assert.doesNotMatch(err.message, /SECRET_SERVICE_KEY_12345/)
    assert.match(err.message, /\[REDACTED\]/)
  }
})

test('parseKmaWeather normalizes KMA ncst items into Korean-friendly DTO', () => {
  const mockItems = [
    { category: 'T1H', obsrValue: '21.5' },
    { category: 'REH', obsrValue: '45' },
    { category: 'PTY', obsrValue: '0' },
    { category: 'RN1', obsrValue: '0' },
    { category: 'WSD', obsrValue: '2.3' },
  ]
  const result = parseKmaWeather(mockItems)
  assert.equal(result.temperature, 21.5)
  assert.equal(result.humidity, 45)
  assert.equal(result.precipitationType, '없음')
  assert.equal(result.precipitation1Hour, '0')
  assert.equal(result.windSpeed, 2.3)
  assert.equal(result.weatherLabel, '맑음')
  assert.equal(result.source, 'kma')
})

test('parseKmaWeather maps precipitation types correctly', () => {
  const rainItems = [{ category: 'PTY', obsrValue: '1' }, { category: 'T1H', obsrValue: '18' }]
  assert.equal(parseKmaWeather(rainItems).weatherLabel, '비')
  assert.equal(parseKmaWeather(rainItems).precipitationType, '비')

  const snowItems = [{ category: 'PTY', obsrValue: '3' }, { category: 'T1H', obsrValue: '-1' }]
  assert.equal(parseKmaWeather(snowItems).weatherLabel, '눈')
  assert.equal(parseKmaWeather(snowItems).precipitationType, '눈')
})

test('parseAirKoreaQuality normalizes station data into official-style grade labels', () => {
  const sampleItem = {
    stationName: '중구',
    dataTime: '2026-10-11 19:00',
    pm25Value: '18',
    pm25Grade: '2',
    pm10Value: '35',
    pm10Grade: '2',
    o3Value: '0.045',
    o3Grade: '2',
    khaiGrade: '2',
  }
  const result = parseAirKoreaQuality(sampleItem)
  assert.equal(result.stationName, '중구')
  assert.equal(result.pm25Value, 18)
  assert.equal(result.pm25GradeLabel, '보통')
  assert.equal(result.pm25Level, 'moderate')
  assert.equal(result.pm10Value, 35)
  assert.equal(result.pm10GradeLabel, '보통')
  assert.equal(result.pm10Level, 'moderate')
  assert.equal(result.primaryGradeLabel, '보통')
  assert.equal(result.source, 'airkorea')
})

test('parseAirKoreaQuality maps grades 1-4 to Korean labels correctly', () => {
  const goodItem = { pm25Grade: '1', pm10Grade: '1' }
  const parsedGood = parseAirKoreaQuality(goodItem)
  assert.equal(parsedGood.pm25GradeLabel, '좋음')
  assert.equal(parsedGood.pm25Level, 'good')

  const badItem = { pm25Grade: '3', pm10Grade: '3' }
  const parsedBad = parseAirKoreaQuality(badItem)
  assert.equal(parsedBad.pm25GradeLabel, '나쁨')
  assert.equal(parsedBad.pm25Level, 'bad')

  const veryBadItem = { pm25Grade: '4', pm10Grade: '4' }
  const parsedVeryBad = parseAirKoreaQuality(veryBadItem)
  assert.equal(parsedVeryBad.pm25GradeLabel, '매우나쁨')
  assert.equal(parsedVeryBad.pm25Level, 'very-bad')
})

test('OwnerPublicDataController denies unauthorized requests', async () => {
  const controller = new OwnerPublicDataController()
  await assert.rejects(
    async () => controller.getWeather(undefined),
    UnauthorizedException,
  )
  await assert.rejects(
    async () => controller.getAirQuality(undefined),
    UnauthorizedException,
  )
  await assert.rejects(
    async () => controller.getCustomsFx(undefined),
    UnauthorizedException,
  )
  await assert.rejects(
    async () => controller.getKospi(undefined),
    UnauthorizedException,
  )
  await assert.rejects(
    async () => controller.getFinance(undefined),
    UnauthorizedException,
  )
})

test('parseCustomsFxXml parses USD exchange rate from customs XML response', async () => {
  const { parseCustomsFxXml } = await import('../src/public-data/customs-fx.js')
  const sampleXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>정상서비스.</resultMsg>
  </header>
  <body>
    <items>
      <item>
        <aplyBgnDt>20261011</aplyBgnDt>
        <cntySgn>US</cntySgn>
        <currSgn>USD</currSgn>
        <fxrt>1,347.03</fxrt>
        <imexTp>2</imexTp>
        <mtryUtNm>US Dollar</mtryUtNm>
      </item>
      <item>
        <aplyBgnDt>20261011</aplyBgnDt>
        <cntySgn>JP</cntySgn>
        <currSgn>JPY</currSgn>
        <fxrt>910.50</fxrt>
        <imexTp>2</imexTp>
        <mtryUtNm>Japanese Yen</mtryUtNm>
      </item>
    </items>
  </body>
</response>`

  const parsed = parseCustomsFxXml(sampleXml, 'USD')
  assert.equal(parsed.currencyCode, 'USD')
  assert.equal(parsed.currencyName, '미국 달러')
  assert.equal(parsed.rate, 1347.03)
  assert.equal(parsed.rateFormatted, '1,347.03원')
  assert.equal(parsed.applyBeginDate, '2026-10-11')
  assert.equal(parsed.rateType, 'import')
  assert.equal(parsed.rateTypeLabel, '관세(과세) 수입환율')
  assert.equal(parsed.label, '관세/과세환율')
  assert.equal(parsed.source, 'customs')
})

test('parseCustomsFxXml throws on upstream error response', async () => {
  const { parseCustomsFxXml } = await import('../src/public-data/customs-fx.js')
  const errorXml = `<response><header><resultCode>30</resultCode><resultMsg>SERVICE KEY ERROR</resultMsg></header></response>`
  assert.throws(() => parseCustomsFxXml(errorXml, 'USD'), /Customs API error/)
})

test('parseKospiItem parses market index into Korean-friendly DTO', async () => {
  const { parseKospiItem } = await import('../src/public-data/stock-price.js')
  const mockItem = {
    basDt: '20261008',
    idxNm: '코스피',
    clpr: '2580.45',
    vs: '12.30',
    fltRt: '0.48',
  }

  const parsed = parseKospiItem(mockItem)
  assert.equal(parsed.name, '코스피')
  assert.equal(parsed.closingPrice, 2580.45)
  assert.equal(parsed.closingPriceFormatted, '2,580.45')
  assert.equal(parsed.changeVsYesterday, 12.3)
  assert.equal(parsed.fluctuationRate, 0.48)
  assert.equal(parsed.fluctuationRateFormatted, '+0.48%')
  assert.equal(parsed.baseDate, '2026-10-08')
  assert.equal(parsed.source, 'fsc-index')
})

