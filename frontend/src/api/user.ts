import api from './client'
import { UserSurvey } from '../types'

export const getUserSurveys = () =>
  api.get<UserSurvey[]>('/user/surveys').then(res => res.data)