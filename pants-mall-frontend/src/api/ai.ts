import client from './client'

type Result<T> = {
  code: number
  msg: string
  data: T
}

export type ProductInfo = {
  spuId: string | number
  name: string
  minPrice: number
  maxPrice: number
  fitTypes?: string[]
  colors?: string[]
  sizes?: string[]
}

export type AiChatReq = {
  question: string
  productList?: ProductInfo[]
  profileId?: string | number
}

export type AiChatResp = {
  answer: string
}

export async function chatWithAi(data: AiChatReq) {
  const resp = await client.post<Result<AiChatResp>>('/ai/chat', data)
  return resp?.data?.data
}