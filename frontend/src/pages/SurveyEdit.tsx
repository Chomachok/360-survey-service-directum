import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSurvey, updateSurvey } from '../api/surveys'
import { getEmployees } from '../api/employees'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import Select from 'react-select'
import { reactSelectStyles } from '../styles/reactSelectStyles'

export default function SurveyEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const surveyId = parseInt(id!)
  const queryClient = useQueryClient()

  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => getSurvey(surveyId),
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [errors, setErrors] = useState<{
    title?: string
    startDate?: string
    endDate?: string
    general?: string
  }>({})

  useEffect(() => {
    if (survey) {
      setTitle(survey.title)
      setDescription(survey.description || '')
      setStartDate(survey.startDate.slice(0, 16))
      setEndDate(survey.endDate.slice(0, 16))
    }
  }, [survey])

  const validate = (): boolean => {
    const newErrors: { title?: string; startDate?: string; endDate?: string } = {}
    if (!title.trim()) newErrors.title = 'Введите название опроса'
    if (!startDate) newErrors.startDate = 'Выберите дату начала'
    if (!endDate) newErrors.endDate = 'Выберите дату окончания'
    else if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      newErrors.endDate = 'Дата окончания должна быть позже даты начала'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const mutation = useMutation({
    mutationFn: (data: any) => updateSurvey(surveyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['survey', surveyId] })
      toast.success('Опрос успешно обновлён!')
      navigate(`/survey/${surveyId}/questions`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.response?.data?.title || error.message || 'Не удалось обновить опрос'
      setErrors((prev) => ({ ...prev, general: message }))
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      title,
      description,
      startDate,
      endDate,
    })
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    setErrors((prev) => ({ ...prev, title: undefined, general: undefined }))
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value)
    setErrors((prev) => ({ ...prev, startDate: undefined, endDate: undefined, general: undefined }))
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value)
    setErrors((prev) => ({ ...prev, endDate: undefined, general: undefined }))
  }

  if (surveyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-directum-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!survey) {
    return <div className="card">Опрос не найден</div>
  }

  const isDraft = survey.status === 'Draft'

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(`/survey/${surveyId}/questions`)}
        className="flex items-center text-gray-500 hover:text-directum-dark mb-6 transition-colors animate-fadeInUp"
      >
        <ArrowLeft size={20} className="mr-2" />
        Назад к вопросам
      </button>

      <div className="card animate-fadeInUp">
        <h1 className="text-2xl font-bold text-directum-dark mb-2">Редактирование опроса</h1>
        <p className="text-gray-500 mb-6">Измените информацию о вашем опросе 360 градусов</p>

        {!isDraft && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
            ⚠️ Редактирование доступно только для опросов в статусе «Черновик».
            Текущий статус: <strong>{survey.status === 'Active' ? 'Активен' : 'Завершён'}</strong>
          </div>
        )}

        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-fadeIn">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="animate-fadeInUp-delay">
            <label className="label-field">Название опроса *</label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              disabled={!isDraft}
              className={`input-field ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Например: Оценка эффективности команды"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          <div className="animate-fadeInUp-delay-2">
            <label className="label-field">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isDraft}
              className="input-field resize-none"
              rows={3}
              placeholder="Опишите цель и задачи опроса..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="animate-fadeInUp-delay-3">
              <label className="label-field">Дата начала *</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={handleStartDateChange}
                disabled={!isDraft}
                className={`input-field ${errors.startDate ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
            </div>
            <div className="animate-fadeInUp-delay-3">
              <label className="label-field">Дата окончания *</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={handleEndDateChange}
                disabled={!isDraft}
                className={`input-field ${errors.endDate ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-100 animate-fadeInUp">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={mutation.isPending || !isDraft}
            >
              {mutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/survey/${surveyId}/questions`)}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}