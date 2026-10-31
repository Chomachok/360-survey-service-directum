import api from './client'
import axios from 'axios'

export interface Employee {
  id: number
  fullName: string
  email: string
}

export interface EmployeeInput {
  fullName: string
  email: string
}

export const getEmployees = () => api.get<Employee[]>('/employees').then(res => res.data)
export const importEmployees = (formData: FormData) => api.post('/employees/import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const createEmployee = (data: EmployeeInput) =>
  api.post<Employee>('/employees', data).then(res => res.data)
export const updateEmployee = (id: number, data: EmployeeInput) =>
  api.put<Employee>(`/employees/${id}`, data).then(res => res.data)
export const deleteEmployee = (id: number) => api.delete(`/employees/${id}`)

export const getEmployeeErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 404 || status === 405) {
      return 'Сервер пока не поддерживает эту операцию. Для обновления и удаления нужны backend-эндпоинты.'
    }
    const responseMessage = error.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.trim()) return responseMessage
  }
  return fallback
}
