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

// Применяет шаблон к опросу. Если у шаблона заданы свои оцениваемые — targetIds можно не передавать.
export const applyRespondentTemplate = (
  surveyId: number,
  dto: { templateId: number; targetIds?: number[] },
) =>
  api
    .post<ApplyRespondentTemplateResult>(`/surveys/${surveyId}/matrix/apply-template`, {
      templateId: dto.templateId,
      targetIds: dto.targetIds ?? [],
    })
    .then((res) => res.data)

export const createTemplateFromSurvey = (dto: {
  surveyId: number
  name: string
  description?: string
}) => api.post<RespondentTemplate>('/respondent-templates/from-survey', dto).then((res) => res.data)