import api from './client'
import type {
  RespondentTemplate,
  CreateRespondentTemplateDto,
  UpdateRespondentTemplateDto,
  ApplyRespondentTemplateResult,
} from '../types'

export const getRespondentTemplates = () =>
  api.get<RespondentTemplate[]>('/respondent-templates').then((res) => res.data)

export const createRespondentTemplate = (dto: CreateRespondentTemplateDto) =>
  api.post<RespondentTemplate>('/respondent-templates', dto).then((res) => res.data)

export const updateRespondentTemplate = (id: number, dto: UpdateRespondentTemplateDto) =>
  api.put<RespondentTemplate>(`/respondent-templates/${id}`, dto).then((res) => res.data)

export const deleteRespondentTemplate = (id: number) => api.delete(`/respondent-templates/${id}`)

// Теперь принимает targetId
export const applyRespondentTemplate = (surveyId: number, dto: { templateId: number; targetId: number }) =>
  api
    .post<ApplyRespondentTemplateResult>(`/surveys/${surveyId}/matrix/apply-template`, dto)
    .then((res) => res.data)

export const createTemplateFromSurvey = (dto: {
  surveyId: number
  name: string
  description?: string
}) => api.post<RespondentTemplate>('/respondent-templates/from-survey', dto).then((res) => res.data)