import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSurveyQuestions, addQuestion, deleteQuestion, getTemplates } from '../api/questions'
import { useState, useRef, useEffect } from 'react'
import { QuestionType, CreateQuestionDto } from '../types'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function QuestionBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const surveyId = parseInt(id!)
  const queryClient = useQueryClient()
  const textInputRef = useRef<HTMLInputElement>(null)

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

  const [errors, setErrors] = useState<{
    text?: string
    options?: string
    general?: string
  }>({})

  // Фокус на первое ошибочное поле
  useEffect(() => {
    if (errors.text && textInputRef.current) {
      textInputRef.current.focus()
    }
  }, [errors])

  const addMutation = useMutation({
    mutationFn: (dto: CreateQuestionDto) => addQuestion(surveyId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', surveyId] })
      setText('')
      setOptions([])
      setSelectedTemplate('')
      setErrors({})
      toast.success('Вопрос добавлен')
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.title ||
        error.response?.data?.message ||
        error.message ||
        'Не удалось добавить вопрос'
      setErrors((prev) => ({ ...prev, general: message }))
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (qId: number) => deleteQuestion(qId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', surveyId] })
      toast.success('Вопрос удалён')
    },
    onError: () => {
      toast.error('Не удалось удалить вопрос')
    },
  })

  // Валидация – ошибки только в форме, тост не показываем
  const validate = (): boolean => {
    const newErrors: { text?: string; options?: string } = {}

    if (!text.trim()) {
      newErrors.text = 'Пожалуйста, введите текст вопроса'
    }

    if (type === QuestionType.SingleChoice) {
      const validOptions = options.filter((o) => o.trim() !== '')
      if (validOptions.length < 2) {
        newErrors.options = 'Добавьте как минимум 2 варианта ответа'
      } else if (options.some((o) => o.trim() === '')) {
        newErrors.options = 'Все варианты должны быть заполнены'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAdd = () => {
    if (!validate()) return

    addMutation.mutate({
      text,
      type,
      required,
      order: (questions?.length || 0) + 1,
      options: type === QuestionType.SingleChoice && options.length > 0 ? options : undefined,
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
      setErrors({})
    }
  }

  const addOption = () => {
    setOptions([...options, ''])
    setErrors((prev) => ({ ...prev, options: undefined, general: undefined }))
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
    setErrors((prev) => ({ ...prev, options: undefined, general: undefined }))
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    setErrors((prev) => ({ ...prev, options: undefined, general: undefined }))
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    setErrors((prev) => ({ ...prev, text: undefined, general: undefined }))
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value as QuestionType)
    setErrors((prev) => ({ ...prev, options: undefined, general: undefined }))
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

            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-fadeIn">
                {errors.general}
              </div>
            )}

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
                  ref={textInputRef}
                  type="text"
                  value={text}
                  onChange={handleTextChange}
                  className={`input-field ${errors.text ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Введите текст вопроса"
                />
                {errors.text && <p className="text-red-500 text-sm mt-1">{errors.text}</p>}
              </div>

              <div className="animate-fadeInUp-delay-2">
                <label className="label-field">Тип вопроса</label>
                <select
                  value={type}
                  onChange={handleTypeChange}
                  className="input-field"
                >
                  <option value={QuestionType.Text}>Текстовый ответ</option>
                  <option value={QuestionType.SingleChoice}>Выбор одного варианта</option>
                </select>
              </div>

              {type === QuestionType.SingleChoice && (
                <div className="animate-fadeInUp-delay-3 space-y-2">
                  <label className="label-field">Варианты ответов *</label>
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className={`input-field flex-1 ${errors.options ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder={`Вариант ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить вариант"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {errors.options && <p className="text-red-500 text-sm mt-1">{errors.options}</p>}
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-sm text-directum-orange hover:underline flex items-center gap-1 mt-1"
                  >
                    <Plus size={16} />
                    Добавить вариант
                  </button>
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
                disabled={addMutation.isPending}
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
                        disabled={deleteMutation.isPending}
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