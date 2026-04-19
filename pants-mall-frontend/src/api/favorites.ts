import client from './client'

type Result<T> = {
  code: number
  msg: string
  data: T
}

export type Favorite = {
  id: string | number
  userId?: string | number
  spuId: string | number
  createdAt?: string
  updatedAt?: string
  deleted?: number
}

export async function listFavorites() {
  const resp = await client.get<Result<Favorite[]>>('/favorites')
  return resp.data.data || []
}

export async function addFavorite(spuId: number | string) {
  const resp = await client.post<Result<any>>(`/favorites/${spuId}`)
  return resp.data
}

export async function removeFavorite(spuId: number | string) {
  const resp = await client.delete<Result<any>>(`/favorites/${spuId}`)
  return resp.data
}