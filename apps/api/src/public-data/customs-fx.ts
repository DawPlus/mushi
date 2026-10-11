import { DataGoKrClient } from './data-go-kr.client.js'

export interface NormalizedCustomsFxDto {
  currencyCode: string // e.g. 'USD'
  currencyName: string // e.g. '미국 달러' or 'US Dollar'
  rate: number // e.g. 1347.03
  rateFormatted: string // e.g. '1,347.03원'
  applyBeginDate: string // e.g. '2026-10-11'
  rateType: 'import' | 'export'
  rateTypeLabel: string // '관세(과세) 수입환율'
  label: string // '관세/과세환율'
  source: 'customs'
}

/**
 * Extract value between XML tags `<tag>value</tag>`
 */
function extractTagValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
  return match ? match[1]?.trim() ?? null : null
}

export function parseCustomsFxXml(
  xml: string,
  targetCurrency: string = 'USD',
): NormalizedCustomsFxDto {
  if (xml.includes('<resultCode>') && !xml.includes('<resultCode>00</resultCode>')) {
    const code = extractTagValue(xml, 'resultCode') ?? 'UNKNOWN'
    const msg = extractTagValue(xml, 'resultMsg') ?? 'Customs API error'
    throw new Error(`Customs API error: ${msg} (${code})`)
  }

  const items = xml.match(/<item>[\s\S]*?<\/item>/g)
  if (!items || items.length === 0) {
    throw new Error('Empty customs FX response items')
  }

  const targetItem = items.find(item => {
    const curr = extractTagValue(item, 'currSgn')
    return curr?.toUpperCase() === targetCurrency.toUpperCase()
  })

  if (!targetItem) {
    throw new Error(`Target currency ${targetCurrency} not found in customs FX data`)
  }

  const currSgn = extractTagValue(targetItem, 'currSgn') ?? targetCurrency
  const mtryUtNm = extractTagValue(targetItem, 'mtryUtNm') ?? 'US Dollar'
  const fxrtStr = extractTagValue(targetItem, 'fxrt') ?? '0'
  const aplyBgnDtStr = extractTagValue(targetItem, 'aplyBgnDt') ?? ''
  const imexTp = extractTagValue(targetItem, 'imexTp') ?? '2'

  const rate = parseFloat(fxrtStr.replace(/,/g, ''))
  if (Number.isNaN(rate)) {
    throw new Error(`Invalid customs FX rate value: ${fxrtStr}`)
  }

  // Format apply date YYYYMMDD -> YYYY-MM-DD
  let formattedDate = aplyBgnDtStr
  if (aplyBgnDtStr.length === 8) {
    formattedDate = `${aplyBgnDtStr.slice(0, 4)}-${aplyBgnDtStr.slice(4, 6)}-${aplyBgnDtStr.slice(6, 8)}`
  }

  return {
    currencyCode: currSgn,
    currencyName: currSgn === 'USD' ? '미국 달러' : mtryUtNm,
    rate,
    rateFormatted: `${rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}원`,
    applyBeginDate: formattedDate,
    rateType: imexTp === '1' ? 'export' : 'import',
    rateTypeLabel: imexTp === '1' ? '관세(과세) 수출환율' : '관세(과세) 수입환율',
    label: '관세/과세환율',
    source: 'customs',
  }
}

/**
 * Returns YYYYMMDD for current Asia/Seoul date.
 */
export function getSeoulDateString(now: Date = new Date()): string {
  const seoulDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = seoulDate.getFullYear()
  const m = pad(seoulDate.getMonth() + 1)
  const d = pad(seoulDate.getDate())
  return `${y}${m}${d}`
}

export async function fetchCustomsFx(
  client: DataGoKrClient,
  currency: string = 'USD',
  now: Date = new Date(),
): Promise<NormalizedCustomsFxDto> {
  const aplyBgnDt = getSeoulDateString(now)
  const endpoint = 'https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo'

  const xml = await client.fetchText(endpoint, {
    aplyBgnDt,
    weekFxrtTpcd: '2', // 수입환율 (주간)
  })

  return parseCustomsFxXml(xml, currency)
}
