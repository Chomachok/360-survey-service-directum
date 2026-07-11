import api from './client'
import { Question, QuestionTemplate, CreateQuestionDto, CreateQuestionTemplateDto } from '../types'

export const getSurveyQuestions = (surveyId: number) => api.get<Question[]>(`/surveys/${surveyId}/questions`).then(res => res.data)
export const addQuestion = (surveyId: number, dto: CreateQuestionDto) => api.post<Question>(`/questions/surveys/${surveyId}`, dto).then(res => res.data)
export const deleteQuestion = (questionId: number) => api.delete(`/questions/${questionId}`)
export const getTemplates = () => api.get<QuestionTemplate[]>('/questions/templates').then(res => res.data)
export const createTemplate = (dto: CreateQuestionTemplateDto) => api.post<QuestionTemplate>('/questions/templates', dto).then(res => res.data)