import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSurveyQuestions, addQuestion, deleteQuestion, getTemplates } from '../api/questions'
import { useState } from 'react'
import { QuestionType, CreateQuestionDto } from '../types'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function QuestionBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const surveyId = parseInt(id!)
  const queryClient = useQueryClient()

  const { data: questions, isLoading: qLoading } = useQuery({
    queryKey: ['questions', surveyId],
    queryFn: () => getSurveyQuestions(surveyId),
  })
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  })

  const [text, setText] = useState('')
  const [type, setType] = useState<QuestionType>(QuestionType.Text)
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | ''>('')

  const addMutation = useMutation({
    mutationFn: (dto: CreateQuestionDto) => addQuestion(surveyId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', surveyId] })
      setText('')
      setOptions([])
      setSelectedTemplate('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (qId: number) => deleteQuestion(qId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', surveyId] }),
  })

  const handleAdd = () => {
    if (!text.trim()) return
    addMutation.mutate({
      text,
      type,
      required,
      order: (questions?.length || 0) + 1,
      options: type === QuestionType.SingleChoice ? options : undefined,
    })
  }

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedTemplate(val === '' ? '' : parseInt(val))
    const tmpl = templates?.find((t) => t.id === parseInt(val))
    if (tmpl) {
      setText(tmpl.text)
      setType(tmpl.type)
      setOptions(tmpl.options || [])
    }
  }

  if (qLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-directum-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-gray-500 hover:text-directum-dark mb-6 transition-colors animate-fadeInUp"
      >
        <ArrowLeft size={20} className="mr-2" />
        Назад к дашборду
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card animate-fadeInUp">
            <h2 className="text-xl font-semibold text-directum-dark mb-4">Добавить вопрос</h2>

            <div className="space-y-4">
              <div className="animate-fadeInUp-delay">
                <label className="label-field">Использовать шаблон</label>
                <select
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                  className="input-field"
                >
                  <option value="">— Выберите шаблон —</option>
                  {templates?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="animate-fadeInUp-delay-2">
                <label className="label-field">Текст вопроса *</label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="input-field"
                  placeholder="Введите текст вопроса"
                />
              </div>

              <div className="animate-fadeInUp-delay-2">
                <label className="label-field">Тип вопроса</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as QuestionType)}
                  className="input-field"
                >
                  <option value={QuestionType.Text}>Текстовый ответ</option>
                  <option value={QuestionType.SingleChoice}>Выбор одного варианта</option>
                </select>
              </div>

              {type === QuestionType.SingleChoice && (
                <div className="animate-fadeInUp-delay-3">
                  <label className="label-field">Варианты ответов</label>
                  <input
                    type="text"
                    value={options.join(', ')}
                    onChange={(e) =>
                      setOptions(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                    }
                    className="input-field"
                    placeholder="Вариант 1, Вариант 2, Вариант 3"
                  />
                </div>
              )}

              <div className="flex items-center animate-fadeInUp-delay-3">
                <input
                  type="checkbox"
                  id="required"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="w-4 h-4 text-directum-orange rounded border-gray-300 focus:ring-directum-orange"
                />
                <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                  Обязательный вопрос
                </label>
              </div>

              <button
                onClick={handleAdd}
                className="btn-primary w-full flex items-center justify-center space-x-2 animate-fadeInUp"
                disabled={addMutation.isPending || !text.trim()}
              >
                <Plus size={18} />
                <span>{addMutation.isPending ? 'Добавление...' : 'Добавить вопрос'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card animate-fadeInUp">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-directum-dark">Вопросы опроса</h2>
              <span className="text-sm text-gray-500">{questions?.length || 0} вопросов</span>
            </div>

            {questions?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>В опросе пока нет вопросов</p>
                <p className="text-sm">Добавьте первый вопрос с помощью формы слева</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions
                  ?.sort((a, b) => a.order - b.order)
                  .map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 animate-fadeInUp"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                          <span className="font-medium text-directum-dark">{q.text}</span>
                          {q.required && (
                            <span className="text-xs text-red-500 font-medium">*</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                            {q.type === QuestionType.Text ? 'Текст' : 'Выбор'}
                          </span>
                          {q.options && q.options.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {q.options.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(q.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:scale-110 transform"
                        title="Удалить вопрос"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}