import api from './client'

export const getResults = (surveyId: number) => api.get(`/surveys/${surveyId}/results`).then(res => res.data)
export const exportDocx = (surveyId: number) => {
  window.open(`/api/surveys/${surveyId}/results/export/docx`, '_blank')
}