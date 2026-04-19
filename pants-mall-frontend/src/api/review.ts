import client from './client'

type Result<T> = {
  code: number
  msg: string
  data: T
}

export type ReviewCreateReq = {
  orderId: string | number
  spuId: string | number
  skuId: string | number
  rating: number
  content: string
  sizeFeel?: string
  lengthFeel?: string
  fitFeel?: string
  fabricFeel?: string
  purchaseSize?: string
  anonymous?: number
  images?: string[]
}

export type ReviewItemVO = {
  id?: string | number
  userId?: string | number
  orderId?: string | number
  spuId?: string | number
  skuId?: string | number
  rating?: number
  content?: string
  sizeFeel?: string
  lengthFeel?: string
  fitFeel?: string
  fabricFeel?: string
  purchaseSize?: string
  anonymous?: number
  username?: string
  images?: string[]
  createdAt?: string
}

export async function createReview(data: ReviewCreateReq) {
  const resp = await client.post<Result<string>>('/review/create', data)
  return resp?.data
}

export async function listReviewsBySpuId(spuId: string | number) {
  const resp = await client.get<Result<ReviewItemVO[]>>('/review/list', {
    params: { spuId },
  })
  return resp?.data?.data || []
}