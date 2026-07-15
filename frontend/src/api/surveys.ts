import api from './client'
import { Survey, CreateSurveyDto, SurveyTemplate } from '../types'

export const getSurveys = (status?: string, search?: string) => {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (search) params.append('search', search)
  const queryString = params.toString()
  return api.get<Survey[]>(`/surveys${queryString ? `?${queryString}` : ''}`).then(res => res.data)
}

export const getSurvey = (id: number) => api.get<Survey>(`/surveys/${id}`).then(res => res.data)

export const createSurvey = (data: CreateSurveyDto) => api.post<Survey>('/surveys', data).then(res => res.data)

export const updateSurvey = (id: number, data: Partial<CreateSurveyDto>) =>
  api.put<Survey>(`/surveys/${id}`, data).then(res => res.data)

export const deleteSurvey = (id: number) => api.delete(`/surveys/${id}`)

export const publishSurvey = (id: number) => api.post<Survey>(`/surveys/${id}/publish`).then(res => res.data)

export const completeSurvey = (id: number) => api.post<Survey>(`/surveys/${id}/complete`).then(res => res.data)

export const saveSurveyAsTemplate = (surveyId: number, data: { name: string; description?: string }) =>
  api.post<SurveyTemplate>(`/surveys/${surveyId}/save-as-template`, data).then(res => res.data)