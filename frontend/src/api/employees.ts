import { adminApi } from './client'
import type { CreateEmployeeDto, Employee, UpdateEmployeeDto } from '../types'
import { getApiErrorMessage } from './errors'

export const employeesQueryKey = ['employees'] as const
export type EmployeeInput = CreateEmployeeDto
export const getEmployeeErrorMessage = getApiErrorMessage

export const getEmployees = async (): Promise<Employee[]> =>
  (await adminApi.get<Employee[]>('/admin-panel/employees')).data

export const getEmployee = async (id: number): Promise<Employee> =>
  (await adminApi.get<Employee>(`/admin-panel/employees/${id}`)).data

export const createEmployee = async (data: CreateEmployeeDto): Promise<Employee> =>
  (await adminApi.post<Employee>('/admin-panel/employees/create', data)).data

export const updateEmployee = async (id: number, data: UpdateEmployeeDto): Promise<Employee> =>
  (await adminApi.patch<Employee>(`/admin-panel/employees/update/${id}`, data)).data

export const deleteEmployee = async (id: number): Promise<void> => {
  await adminApi.delete(`/admin-panel/employees/delete/${id}`)
}

export const importEmployees = async (formData: FormData): Promise<{ message: string }> =>
  (await adminApi.post<{ message: string }>('/admin-panel/employees/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data
