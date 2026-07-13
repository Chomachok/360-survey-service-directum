import api from './client'
import type { MatrixItem } from '../types'

export const getMatrix = (surveyId: number) => api.get<MatrixItem[]>(`/surveys/${surveyId}/matrix`).then(res => res.data)
export const addMatrixItem = (surveyId: number, data: { evaluatorId: number, targetId: number, role: string }) => api.post<MatrixItem>(`/surveys/${surveyId}/matrix`, data).then(res => res.data)
export const deleteMatrixItem = (assignmentId: number) => api.delete(`/matrix/${assignmentId}`)