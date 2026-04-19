import client from './client'

type Result<T> = {
  code: number
  msg: string
  data: T
}

export type AddressItem = {
  id?: number | string
  userId?: number | string
  receiver?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
  isDefault?: number
  createdAt?: string
  updatedAt?: string
  deleted?: number
}

export async function listMyAddresses() {
  const resp = await client.get<Result<AddressItem[]>>('/address/list')
  return resp.data.data || []
}

export async function saveAddress(address: {
  receiver: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault?: number
}) {
  const resp = await client.post<Result<any>>('/address/save', address)
  return resp.data
}

export async function deleteAddress(id: number | string) {
  const resp = await client.delete<Result<any>>(`/address/${id}`)
  return resp.data
}

export async function setDefaultAddress(id: number | string) {
  const resp = await client.put<Result<any>>(`/address/${id}/default`)
  return resp.data
}