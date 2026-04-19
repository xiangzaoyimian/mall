import client from './client'

export type Result<T> = {
  code: number
  msg: string
  data: T
}

export type AfterSaleType = 'REFUND' | 'RETURN_REFUND'
export type AfterSaleStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'RETURNED'
  | 'COMPLETED'
  | 'REJECTED'

export type AfterSaleCreateReq = {
  type: AfterSaleType
  reason: string
  description?: string
}

export type AfterSaleVO = {
  id?: string | number
  orderId?: string | number
  orderNo?: string
  userId?: string | number
  type?: AfterSaleType | string
  reason?: string
  description?: string
  status?: AfterSaleStatus | string
  adminRemark?: string
  createdAt?: string
  updatedAt?: string
}

export type AfterSalePageResp = {
  total: number
  page: number
  size: number
  list: AfterSaleVO[]
}

export type AfterSaleQueryParams = {
  page?: number
  size?: number
  status?: string
  type?: string
  orderNo?: string
}

export async function createAfterSale(
  orderId: string | number,
  payload: AfterSaleCreateReq
) {
  const resp = await client.post<Result<string | number | null>>(
    `/orders/${orderId}/after-sale`,
    {
      type: payload.type,
      reason: payload.reason,
      description: payload.description,
    }
  )
  return resp?.data
}

export async function getMyAfterSale(orderId: string | number) {
  const resp = await client.get<Result<AfterSaleVO | null>>(
    `/orders/${orderId}/after-sale`
  )
  return resp?.data?.data || null
}

export async function markAfterSaleReturned(orderId: string | number) {
  const resp = await client.post<Result<null>>(
    `/orders/${orderId}/after-sale/returned`
  )
  return resp?.data
}

export async function adminListAfterSales(params?: AfterSaleQueryParams) {
  const resp = await client.get<Result<AfterSalePageResp>>(
    '/admin/after-sales',
    {
      params: {
        page: params?.page,
        size: params?.size,
        status: params?.status,
        type: params?.type,
        orderNo: params?.orderNo,
      },
    }
  )

  return (
    resp?.data?.data || {
      total: 0,
      page: 1,
      size: 10,
      list: [],
    }
  )
}

export async function adminGetAfterSaleDetail(id: string | number) {
  const resp = await client.get<Result<AfterSaleVO>>(`/admin/after-sales/${id}`)
  return resp?.data?.data
}

export async function adminAuditAfterSale(
  id: string | number,
  payload: { status: 'APPROVED' | 'REJECTED'; adminRemark?: string }
) {
  const resp = await client.put<Result<null>>(
    `/admin/after-sales/${id}/audit`,
    payload
  )
  return resp?.data
}

export async function adminReceiveAfterSaleRefund(id: string | number) {
  const resp = await client.put<Result<null>>(`/admin/after-sales/${id}/receive`)
  return resp?.data
}