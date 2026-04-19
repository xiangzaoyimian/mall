import client from './client'

type Result<T> = {
  code: number
  msg: string
  data: T
}

export type MeInfo = {
  id?: string | number
  username?: string
  nickname?: string
  role?: string
  status?: string
  heightCm?: number
  waistCm?: number
  legLengthCm?: number
}

export async function login(username: string, password: string) {
  const resp = await client.post<Result<{ token: string }>>('/auth/login', {
    username,
    password,
  })
  return resp.data
}

export async function getMe() {
  const resp = await client.get<Result<MeInfo>>('/me')
  return resp.data
}

export async function updateMyNickname(nickname: string) {
  const resp = await client.put<Result<null>>('/me/nickname', {
    nickname,
  })
  return resp.data
}

export async function updateMyBody(data: {
  heightCm?: number
  waistCm?: number
  legLengthCm?: number
}) {
  const resp = await client.post<Result<null>>('/me/body', data)
  return resp.data
}

export async function updateMyPassword(password: string) {
  const resp = await client.post<Result<null>>('/user/update-password', { password })
  return resp.data
}