import { DataGoKrClient } from './data-go-kr.client.js'

/** KOSPI market index only (금융위원회_지수시세정보). */
export interface NormalizedKospiDto {
  name: string
  closingPrice: number
  closingPriceFormatted: string
  changeVsYesterday: number
  fluctuationRate: number
  fluctuationRateFormatted: string
  baseDate: string
  source: 'fsc-index'
}

export interface FscIndexItemRaw {
  basDt?: string
  idxNm?: string
  idxCsf?: string
  epyItmCnt?: string
  clpr?: string
  vs?: string
  fltRt?: string
  mkp?: string
  hipr?: string
  lopr?: string
  trqu?: string
  trPrc?: string
}

export function parseKospiItem(item: FscIndexItemRaw): NormalizedKospiDto {
  const name = (item.idxNm ?? '코스피').trim() || '코스피'
  const clpr = parseFloat(item.clpr ?? '0')
  const vs = parseFloat(item.vs ?? '0')
  const fltRt = parseFloat(item.fltRt ?? '0')
  const basDt = item.basDt ?? ''

  let formattedDate = basDt
  if (basDt.length === 8) {
    formattedDate = `${basDt.slice(0, 4)}-${basDt.slice(4, 6)}-${basDt.slice(6, 8)}`
  }

  const sign = fltRt > 0 ? '+' : ''
  return {
    name,
    closingPrice: clpr,
    closingPriceFormatted: clpr.toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    changeVsYesterday: vs,
    fluctuationRate: fltRt,
    fluctuationRateFormatted: `${sign}${fltRt.toFixed(2)}%`,
    baseDate: formattedDate,
    source: 'fsc-index',
  }
}

/**
 * Latest KOSPI close from FSC market index API.
 * Requires 활용신청: 금융위원회_지수시세정보 (data.go.kr/15094807).
 */
export async function fetchKospiIndex(client: DataGoKrClient): Promise<NormalizedKospiDto> {
  const endpoint =
    'https://apis.data.go.kr/1160100/service/GetMarketIndexInfoService/getStockMarketIndex'

  const json = await client.fetchJson<{
    response?: {
      header?: { resultCode: string; resultMsg: string }
      body?: {
        items?: {
          item?: FscIndexItemRaw | FscIndexItemRaw[]
        }
        totalCount?: number | string
      }
    }
  }>(endpoint, {
    resultType: 'json',
    numOfRows: 5,
    pageNo: 1,
    idxNm: '코스피',
  })

  const header = json?.response?.header
  if (header?.resultCode && header.resultCode !== '00') {
    throw new Error(`FSC Index API error: ${header.resultMsg} (${header.resultCode})`)
  }

  const itemsRaw = json?.response?.body?.items?.item
  const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw ? [itemsRaw] : []
  const kospi =
    items.find(i => (i.idxNm ?? '').trim() === '코스피') ??
    items.find(i => (i.idxNm ?? '').includes('코스피')) ??
    items[0]

  if (!kospi) {
    throw new Error('KOSPI index not found in FSC market index response')
  }

  return parseKospiItem(kospi)
}
