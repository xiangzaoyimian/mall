import client from './client'

type Result<T> = {
  code: number
  msg: string
  data: T
}

export type RecommendItem = {
  spuId?: string | number
  skuId?: string | number
  name?: string
  price?: number
  coverUrl?: string
  stock?: number
  fitType?: string
  lengthCm?: number
  waistCm?: number
  reason?: string
  matchScore?: number
  recommendType?: 'BEST' | 'GOOD' | 'FALLBACK' | string
}

export async function getRecommendByProfile(profileId: string | number) {
  const resp = await client.get<Result<RecommendItem[]>>(
    `/recommend/pants/by-profile?profileId=${profileId}`
  )
  return resp?.data?.data || []
}