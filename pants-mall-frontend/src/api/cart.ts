import client from './client'

type Result<T> = {
  code: number
  msg: string
  data: T
}

export type CartItem = {
  id?: string | number
  skuId?: string | number
  spuId?: string | number
  title?: string
  price?: number
  quantity?: number
  stock?: number
  color?: string
  size?: string
  lengthCm?: number
  coverUrl?: string
  spuName?: string
  spuDescription?: string
}

export async function listCart() {
  const resp = await client.get<Result<CartItem[]>>('/cart/items')
  return resp.data.data || []
}

export async function addToCart(skuId: number | string, quantity = 1) {
  const resp = await client.post<Result<any>>('/cart/items', {
    skuId,
    quantity,
  })
  return resp.data
}

export async function updateCartItem(id: number | string, quantity: number) {
  const resp = await client.put<Result<any>>('/cart/items', {
    id,
    quantity,
  })
  return resp.data
}

export async function removeCartItem(id: number | string) {
  const resp = await client.put<Result<any>>('/cart/items', {
    id,
    quantity: 0,
  })
  return resp.data
}