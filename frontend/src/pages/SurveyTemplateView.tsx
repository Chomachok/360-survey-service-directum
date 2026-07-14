import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSurveyTemplate } from '../api/surveyTemplates'
import { ArrowLeft, Eye, FileText, ListChecks } from 'lucide-react'
import { QuestionType } from '../types'

export default function SurveyTemplateView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const templateId = parseInt(id!)

  const { data: template, isLoading, error } = useQuery({
    queryKey: ['surveyTemplate', templateId],
    queryFn: () => getSurveyTemplate(templateId),
    enabled: !!templateId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-directum-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="card max-w-3xl mx-auto mt-8 text-center py-12">
        <p className="text-gray-500">Шаблон не найден</p>
        <button onClick={() => navigate('/survey-templates')} className="btn-primary mt-4">
          Назад к шаблонам
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/survey-templates')}
        className="flex items-center text-gray-500 hover:text-directum-dark mb-6 transition-colors animate-fadeInUp"
      >
        <ArrowLeft size={20} className="mr-2" />
        Назад к шаблонам
      </button>

      <div className="card animate-fadeInUp">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-directum-dark">{template.name}</h1>
            {template.description && (
              <p className="text-gray-500 mt-1">{template.description}</p>
            )}
          </div>
          <span className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-600 flex items-center gap-1">
            <ListChecks size={14} />
            {template.questions.length} вопросов
          </span>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h2 className="text-lg font-semibold text-directum-dark mb-4">Вопросы</h2>
          <div className="space-y-4">
            {template.questions.map((q, index) => (
              <div key={q.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-400 min-w-[30px]">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-directum-dark">{q.text}</p>
                      {q.required && <span className="text-xs text-red-500 font-medium">*</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">
                        {q.type === QuestionType.Text ? 'Текст' : 'Выбор варианта'}
                      </span>
                      {q.type === QuestionType.SingleChoice && q.options && q.options.length > 0 && (
                        <span className="text-xs text-gray-500">
                          Варианты: {q.options.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => navigate(`/survey-templates/${templateId}/edit`)}
            className="btn-primary flex-1"
          >
            Редактировать
          </button>
          <button
            onClick={() => navigate('/survey/new', { state: { templateId } })}
            className="btn-secondary flex-1"
          >
            Создать опрос из шаблона
          </button>
        </div>
      </div>
    </div>
  )
}