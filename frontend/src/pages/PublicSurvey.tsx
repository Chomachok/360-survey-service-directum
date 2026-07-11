import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getPublicSurvey, submitAnswers } from '../api/public'
import { useState } from 'react'
import { QuestionType } from '../types'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function PublicSurvey() {
  const { token } = useParams<{ token: string }>()
  const { data: survey, isLoading, error } = useQuery({
    queryKey: ['public', token],
    queryFn: () => getPublicSurvey(token!),
    enabled: !!token,
  })

  const [answers, setAnswers] = useState<{ [key: number]: string }>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (data: any[]) => submitAnswers(token!, data),
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => {
      setSubmitError(err.response?.data || 'Произошла ошибка при отправке')
    },
  })

  const handleChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setSubmitError(null)
  }

  const handleSubmit = () => {
    const missingRequired = survey?.questions
      .filter((q) => q.required)
      .filter((q) => !answers[q.id] || answers[q.id].trim() === '')
      .map((q) => q.text)

    if (missingRequired && missingRequired.length > 0) {
      setSubmitError(`Пожалуйста, ответьте на обязательные вопросы: ${missingRequired.join(', ')}`)
      return
    }

    const answerList = Object.entries(answers).map(([qId, val]) => ({
      questionId: Number(qId),
      textAnswer: val,
      selectedOption: val,
    }))
    mutation.mutate(answerList)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-directum-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50 max-w-2xl mx-auto mt-8 animate-fadeIn">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle size={24} />
          <p>Не удалось загрузить опрос. Возможно, ссылка недействительна.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="card max-w-2xl mx-auto mt-8 text-center py-12 animate-fadeInUp">
        <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-directum-dark">Спасибо!</h2>
        <p className="text-gray-500 mt-2">Ваши ответы успешно сохранены.</p>
      </div>
    )
  }

  const roleLabels = {
    SelfAssessment: 'Самооценка',
    Manager: 'Оценка руководителем',
    Colleague: 'Оценка коллегой',
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card animate-fadeInUp">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-directum-dark">{survey?.surveyTitle}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
            <span>👤 Оцениваемый: <strong>{survey?.targetName}</strong></span>
            <span>🏷️ Роль: <strong>{survey?.role ? roleLabels[survey.role] : ''}</strong></span>
          </div>
        </div>

        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start space-x-2 animate-fadeIn">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="space-y-6">
          {survey?.questions.map((q, index) => (
            <div
              key={q.id}
              className="border-b border-gray-100 pb-4 last:border-0 animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start space-x-2">
                <span className="text-sm font-medium text-gray-400 mt-0.5">#{index + 1}</span>
                <div className="flex-1">
                  <p className="font-medium text-directum-dark">
                    {q.text}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </p>

                  {q.type === QuestionType.Text && (
                    <textarea
                      className="input-field mt-2 resize-none"
                      rows={3}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                      placeholder="Введите ваш ответ..."
                    />
                  )}

                  {q.type === QuestionType.SingleChoice && q.options && (
                    <div className="mt-2 space-y-2">
                      {q.options.map((opt) => (
                        <label key={opt} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            name={`q${q.id}`}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={(e) => handleChange(q.id, e.target.value)}
                            className="w-4 h-4 text-directum-orange focus:ring-directum-orange"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          className="btn-primary w-full mt-6 animate-fadeInUp"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Отправка...' : 'Отправить ответы'}
        </button>
      </div>
    </div>
  )
}