import axios, { type InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// AdminPanelController is routed directly under /admin-panel (without /api).
export const adminApi = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
})

const addAuthToken = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}

api.interceptors.request.use(addAuthToken)
adminApi.interceptors.request.use(addAuthToken)

const handleResponseError = (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('isAdmin')
    if (window.location.pathname !== '/login') window.location.href = '/login'
  }
  return Promise.reject(error)
}

api.interceptors.response.use((response) => response, handleResponseError)
adminApi.interceptors.response.use((response) => response, handleResponseError)

export default api
