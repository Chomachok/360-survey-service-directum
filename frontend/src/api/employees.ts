import api from './client'

export const getEmployees = () => api.get<{ id: number, fullName: string }[]>('/employees').then(res => res.data)
export const importEmployees = (formData: FormData) => api.post('/employees/import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const createEmployee = (data: { fullName: string; email: string }) => 
  api.post<{ id: number; fullName: string; email: string }>('/employees', data).then(res => res.data)