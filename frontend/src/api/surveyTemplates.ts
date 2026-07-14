import api from './client'
import { SurveyTemplate, CreateSurveyTemplateDto, UpdateSurveyTemplateDto } from '../types'

export const getSurveyTemplates = () =>
  api.get<SurveyTemplate[]>('/surveyTemplates').then(res => res.data)

export const getSurveyTemplate = (id: number) =>
  api.get<SurveyTemplate>(`/surveyTemplates/${id}`).then(res => res.data)

export const createSurveyTemplate = (data: CreateSurveyTemplateDto) =>
  api.post<SurveyTemplate>('/surveyTemplates', data).then(res => res.data)

export const updateSurveyTemplate = (id: number, data: UpdateSurveyTemplateDto) =>
  api.put<SurveyTemplate>(`/surveyTemplates/${id}`, data).then(res => res.data)

export const deleteSurveyTemplate = (id: number) =>
  api.delete(`/surveyTemplates/${id}`)