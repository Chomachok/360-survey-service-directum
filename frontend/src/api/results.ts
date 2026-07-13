import api from './client'
import type { SurveyResults } from '../types'

export const getResults = (surveyId: number): Promise<SurveyResults> =>
  api.get(`/surveys/${surveyId}/results`).then(res => res.data)
export const exportDocx = (surveyId: number) => {
  window.open(`/api/surveys/${surveyId}/results/export/docx`, '_blank')
}