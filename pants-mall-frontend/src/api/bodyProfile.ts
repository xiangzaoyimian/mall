import client from './client'

type Result<T> = {
  code: number
  msg: string
  data: T
}

export type BodyProfile = {
  id?: number | string
  name?: string
  heightCm?: number
  weightKg?: number
  waistCm?: number
  legLengthCm?: number
}

export async function listProfiles() {
  const resp = await client.get<Result<BodyProfile[]>>('/body-profile/list')
  return resp?.data?.data || []
}

export async function getProfileById(id: number | string) {
  const resp = await client.get<Result<BodyProfile>>(`/admin/body-profile/${id}`)
  return resp?.data?.data
}

export async function addProfile(data: BodyProfile) {
  const resp = await client.post<Result<any>>('/body-profile', data)
  return resp?.data
}

export async function deleteProfile(id: number | string) {
  const resp = await client.delete<Result<any>>(`/body-profile/${id}`)
  return resp?.data
}

export async function updateProfile(id: number | string, data: BodyProfile) {
  const resp = await client.put<Result<any>>('/body-profile', { ...data, id })
  return resp?.data
}