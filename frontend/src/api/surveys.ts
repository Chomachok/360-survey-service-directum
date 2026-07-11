import api from './client'
import { Survey, CreateSurveyDto } from '../types'

export const getSurveys = () => api.get<Survey[]>('/surveys').then(res => res.data)
export const createSurvey = (data: CreateSurveyDto) => api.post<Survey>('/surveys', data).then(res => res.data)
export const updateSurvey = (id: number, data: Partial<CreateSurveyDto>) => api.put<Survey>(`/surveys/${id}`, data).then(res => res.data)
export const deleteSurvey = (id: number) => api.delete(`/surveys/${id}`)