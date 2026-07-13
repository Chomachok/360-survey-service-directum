import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createSurvey } from '../api/surveys'
import { getEmployees } from '../api/employees'
import { CreateSurveyDto } from '../types'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SurveyCreate() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [targetId, setTargetId] = useState<number | ''>('')
  const authorId = 1

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  })

  const [errors, setErrors] = useState<{
    title?: string
    startDate?: string
    endDate?: string
    targetId?: string
    general?: string
  }>({})

  const validate = (): boolean => {
    const newErrors: { title?: string; startDate?: string; endDate?: string; targetId?: string } = {}

    if (!title.trim()) newErrors.title = 'Введите название опроса'
    if (!startDate) newErrors.startDate = 'Выберите дату начала'
    if (!endDate) newErrors.endDate = 'Выберите дату окончания'
    else if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      newErrors.endDate = 'Дата окончания должна быть позже даты начала'
    }
    if (!targetId) newErrors.targetId = 'Выберите сотрудника, для которого проводится опрос'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const mutation = useMutation({
    mutationFn: (data: CreateSurveyDto) => createSurvey(data),
    onSuccess: (survey) => {
      toast.success('Опрос успешно создан! Теперь добавьте вопросы.')
      navigate(`/survey/${survey.id}/questions`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.response?.data?.title || error.message || 'Не удалось создать опрос'
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
      authorId,
      targetId: Number(targetId),
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

  const handleTargetIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetId(e.target.value === '' ? '' : Number(e.target.value))
    setErrors((prev) => ({ ...prev, targetId: undefined, general: undefined }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-gray-500 hover:text-directum-dark mb-6 transition-colors animate-fadeInUp"
      >
        <ArrowLeft size={20} className="mr-2" />
        Назад к дашборду
      </button>

      <div className="card animate-fadeInUp">
        <h1 className="text-2xl font-bold text-directum-dark mb-2">Создание нового опроса</h1>
        <p className="text-gray-500 mb-6">Заполните информацию о вашем опросе 360 градусов</p>

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
              maxLength={250}
              onChange={handleTitleChange}
              className={`input-field ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Например: Оценка эффективности команды"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            <div className="text-sm text-gray-400 mt-1 text-right">
              {title.length}/250
            </div>
          </div>

          <div className="animate-fadeInUp-delay-2">
            <label className="label-field">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Опишите цель и задачи опроса..."
            />
          </div>

          <div className="animate-fadeInUp-delay-2">
            <label className="label-field">Сотрудник, по которому проводится опрос *</label>
            <select
              value={targetId}
              onChange={handleTargetIdChange}
              className={`input-field ${errors.targetId ? 'border-red-500 focus:ring-red-500' : ''}`}
            >
              <option value="">Выберите сотрудника</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
            {errors.targetId && <p className="text-red-500 text-sm mt-1">{errors.targetId}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="animate-fadeInUp-delay-3">
              <label className="label-field">Дата начала *</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={handleStartDateChange}
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
                className={`input-field ${errors.endDate ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-100 animate-fadeInUp">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Создание...' : 'Создать опрос'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}