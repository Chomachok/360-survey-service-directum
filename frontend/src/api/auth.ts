import api from './client'

export interface AuthResponse {
  token: string
  fullName: string
  isAdmin: boolean
  email: string
}

export const sendCode = (email: string) =>
  api.post('/auth/send-code', { email }).then(res => res.data)

export const verifyCode = (email: string, code: string) =>
  api.post<AuthResponse>('/auth/verify', { email, code }).then(res => res.data)