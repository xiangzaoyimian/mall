import client from './client'

export type Result<T> = {
  code: number
  msg: string
  data: T
}

export type SkuItem = {
  id?: string | number
  skuId?: string | number
  spuId: string | number
  title: string
  price: number
  stock: number
  color: string
  size: string
  lengthCm: number
  waistCm: number
  legOpeningCm: number
  fitType: string
}

export type SearchPantsParams = {
  spuId?: string | number
  color?: string
  size?: string
  lengthCm?: number
  waistCm?: number
  legOpeningCm?: number
  fitType?: string
  minPrice?: number
  maxPrice?: number
  limit?: number
}

export async function searchPants(params: SearchPantsParams) {
  const resp = await client.get<Result<SkuItem[]>>('/pants/search', { params })
  return resp.data.data
}

export async function searchByLength(length: number) {
  const resp = await client.get<Result<SkuItem[]>>('/pants/search-by-length', {
    params: { length },
  })
  return resp.data.data
}

export async function getOptions(spuId: string | number) {
  const resp = await client.get<
    Result<{
      values: {
        sizes?: string
        colors?: string
        lengths?: string
        waists?: string
        legOpenings?: string
        fitTypes?: string
      }
      skus: SkuItem[]
    }>
  >('/pants/options', { params: { spuId: String(spuId) } })
  return resp.data.data
}