import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createSurvey } from '../api/surveys'
import { CreateSurveyDto } from '../types'
import { ArrowLeft } from 'lucide-react'

export default function SurveyCreate() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const authorId = 1

  const mutation = useMutation({
    mutationFn: (data: CreateSurveyDto) => createSurvey(data),
    onSuccess: (survey) => navigate(`/survey/${survey.id}/questions`),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ title, description, startDate, endDate, authorId })
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="animate-fadeInUp-delay">
            <label className="label-field">Название опроса *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Например: Оценка эффективности команды"
              required
            />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="animate-fadeInUp-delay-3">
              <label className="label-field">Дата начала *</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div className="animate-fadeInUp-delay-3">
              <label className="label-field">Дата окончания *</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-100 animate-fadeInUp">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Создание...' : 'Создать опрос'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
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