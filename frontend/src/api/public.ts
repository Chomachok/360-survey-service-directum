import api from './client'
import { PublicSurvey, AnswerSubmit } from '../types'

export const getPublicSurvey = (token: string) =>
  api.get<PublicSurvey>(`/public/${token}`).then(res => res.data)

export const submitAnswers = (token: string, answers: AnswerSubmit[]) =>
  api.post(`/public/${token}/answers`, { answers })