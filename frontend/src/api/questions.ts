import api from './client'
import { Question, QuestionTemplate, CreateQuestionDto, CreateQuestionTemplateDto, UpdateQuestionTemplateDto, UpdateQuestionOrderDto } from '../types'

export const getSurveyQuestions = (surveyId: number) =>
  api.get<Question[]>(`/questions/surveys/${surveyId}`).then(res => res.data)

export const addQuestion = (surveyId: number, dto: CreateQuestionDto) =>
  api.post<Question>(`/questions/surveys/${surveyId}`, dto).then(res => res.data)

export const deleteQuestion = (questionId: number) =>
  api.delete(`/questions/${questionId}`)

export const getTemplates = () =>
  api.get<QuestionTemplate[]>('/questions/templates').then(res => res.data)

export const createTemplate = (dto: CreateQuestionTemplateDto) =>
  api.post<QuestionTemplate>('/questions/templates', dto).then(res => res.data)

export const updateTemplate = (id: number, dto: UpdateQuestionTemplateDto) => 
  api.put<QuestionTemplate>(`/questions/templates/${id}`, dto).then(res => res.data)

export const deleteTemplate = (id: number) => 
  api.delete(`/questions/templates/${id}`)

export const updateQuestion = (id: number, dto: any) => 
  api.put<Question>(`/questions/${id}`, dto).then(res => res.data)

export const updateQuestionsOrder = (surveyId: number, orders: UpdateQuestionOrderDto[]) =>
  api.put(`/questions/surveys/${surveyId}/reorder`, orders)