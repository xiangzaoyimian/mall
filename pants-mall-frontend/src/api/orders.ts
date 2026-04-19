import client from './client'

export type Result<T> = {
  code: number
  msg: string
  data: T
}

export type OrderItemReq = {
  skuId: string | number
  quantity: number
}

export type CreateOrderReq = {
  items: OrderItemReq[]
}

export type CreateOrderWithAddressReq = {
  addressId: string | number
  items: OrderItemReq[]
}

export type AfterSaleBriefVO = {
  id?: string | number
  type?: string
  status?: string
  reason?: string
  description?: string
  adminRemark?: string
  createdAt?: string
}

export type OrderItemVO = {
  id?: string | number
  skuId?: string | number
  spuId?: string | number
  spuName?: string
  spuDescription?: string
  coverUrl?: string
  title?: string
  skuTitle?: string
  color?: string
  size?: string
  lengthCm?: number
  waistCm?: number
  legOpeningCm?: number
  fitType?: string
  price?: number
  quantity?: number
  amount?: number
  reviewed?: boolean
}

export type OrderVO = {
  id?: string | number
  orderNo?: string
  status?: string
  totalAmount?: number
  paidAt?: string | null
  createdAt?: string
  items?: OrderItemVO[]
  afterSale?: AfterSaleBriefVO | null
}

export type OrderPageResp = {
  total: number
  list: OrderVO[]
}

export type OrderQueryParams = {
  page?: number
  size?: number
  status?: string
  orderNo?: string
}

export async function createOrder(items: OrderItemReq[]) {
  const resp = await client.post<Result<string | number | null>>('/orders', {
    items,
  })
  return resp?.data?.data
}

export async function createOrderWithAddress(
  payload: CreateOrderWithAddressReq
) {
  const resp = await client.post<Result<string | number | null>>('/orders', {
    addressId: payload.addressId,
    items: payload.items.map((item) => ({
      skuId: item.skuId,
      quantity: item.quantity,
    })),
  })

  return resp?.data?.data
}

export async function listOrders(params?: OrderQueryParams) {
  const resp = await client.get<Result<OrderPageResp>>('/orders', {
    params: {
      page: params?.page,
      size: params?.size,
      status: params?.status,
      orderNo: params?.orderNo,
    },
  })

  return resp?.data?.data || { total: 0, list: [] }
}

export async function getOrderDetail(id: string | number) {
  const resp = await client.get<Result<OrderVO>>(`/orders/${id}`)
  return resp?.data?.data
}

export async function payOrder(id: string | number) {
  const resp = await client.post<Result<null>>(`/orders/${id}/pay`)
  return resp?.data
}

export async function cancelOrder(id: string | number) {
  const resp = await client.post<Result<null>>(`/orders/${id}/cancel`)
  return resp?.data
}

export async function finishOrder(id: string | number) {
  const resp = await client.post<Result<null>>(`/orders/${id}/finish`)
  return resp?.data
}