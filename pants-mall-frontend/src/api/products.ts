import client from './client'

export type Result<T> = {
  code: number
  msg: string
  data: T
}

export type ProductSpu = {
  id: string | number
  name: string
  categoryId: string | number
  description: string
  status: string
  sales: number
  coverUrl: string
  createdAt?: string
  updatedAt?: string
  deleted?: number
}

export type ProductItem = {
  id: string | number
  name?: string
  categoryId?: string | number
  description?: string
  status?: string
  sales?: number
  coverUrl?: string
  minPrice?: number
  maxPrice?: number
  totalStock?: number
}

export type ProductCompareItem = {
  id: string | number
  categoryId?: string | number
  name?: string
  description?: string
  coverUrl?: string
  sales?: number
  minPrice?: number
  maxPrice?: number
  totalStock?: number
  inStock?: boolean
  colors?: string[]
  sizes?: string[]
  fitTypes?: string[]
  minWaistCm?: number
  maxWaistCm?: number
  minLengthCm?: number
  maxLengthCm?: number
  minLegOpeningCm?: number
  maxLegOpeningCm?: number
  avgRating?: number
  reviewCount?: number
  goodReviewCount?: number
  goodReviewRate?: number
}

export type ProductListResp = {
  total: number
  list: ProductItem[]
}

export type ProductQueryParams = {
  pageNo?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  minPrice?: number
  maxPrice?: number
  color?: string
  colorFamily?: string
  size?: string
  fitType?: string
  onlyInStock?: boolean
  sortBy?: string
  sortOrder?: string
  lengthMin?: number
  lengthMax?: number
  waistMin?: number
  waistMax?: number
  legOpeningMin?: number
  legOpeningMax?: number
}

export async function getProductDetail(id: number | string) {
  const resp = await client.get<Result<ProductSpu>>(`/products/${id}`)
  return resp.data.data
}

export async function getProductList(params: ProductQueryParams) {
  const resp = await client.get<Result<ProductListResp>>('/products', { params })
  return resp.data.data || { total: 0, list: [] }
}

export async function getProductCompare(spuIds: Array<string | number>) {
  const ids = spuIds
    .map((item) => String(item || '').trim())
    .filter(Boolean)

  if (!ids.length) return []

  const query = ids.map((id) => `spuIds=${encodeURIComponent(id)}`).join('&')

  const resp = await client.get<Result<ProductCompareItem[]>>(
    `/products/compare?${query}`
  )

  return resp.data.data || []
}

export function onProduct(id: number) {
  return client.put(`/admin/spu/${id}/on`)
}

export function offProduct(id: number) {
  return client.put(`/admin/spu/${id}/off`)
}