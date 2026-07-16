import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSurveyQuestions,
  addQuestion,
  deleteQuestion,
  getTemplates,
  updateQuestion,
  updateQuestionsOrder,
  saveQuestionAsTemplate,
} from '../api/questions'
import { getSurvey } from '../api/surveys'
import { saveSurveyAsTemplate } from '../api/surveys'
import { useState, useRef, useEffect } from 'react'
import {
  QuestionType,
  CreateQuestionDto,
  UpdateQuestionDto,
  UpdateQuestionOrderDto,
} from '../types'
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Edit,
  Save,
  XCircle,
  ArrowRight,
  GripVertical,
  FileText,
  FilePlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import LogoLoader from '../components/LogoLoader'

// Компонент для отдельного вопроса (с поддержкой перетаскивания)
const SortableQuestionItem = ({
  question,
  index,
  isDraft,
  onEdit,
  onDelete,
  onSaveAsTemplate,
  isDeleting,
  isUpdating,
}: {
  question: any
  index: number
  isDraft: boolean
  onEdit: (q: any) => void
  onDelete: (id: number) => void
  onSaveAsTemplate: (id: number, text: string) => void
  isDeleting: boolean
  isUpdating: boolean
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        animationDelay: `${index * 100}ms`,
      }}
      className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 animate-fadeInUp"
    >
      <div className="flex items-start gap-3 flex-1">
        {isDraft && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <GripVertical size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
            <span className="font-medium text-directum-dark break-words">{question.text}</span>
            {question.required && <span className="text-xs text-red-500 font-medium">*</span>}
          </div>
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
              {question.type === QuestionType.Text ? 'Текст' : 'Выбор'}
            </span>
            {question.options && question.options.length > 0 && (
              <span className="text-xs text-gray-500 truncate max-w-xs">
                {question.options.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1 flex-shrink-0 ml-4">
        {isDraft && (
          <>
            <button
              onClick={() => onSaveAsTemplate(question.id, question.text)}
              className="text-green-500 hover:text-green-700 transition-colors p-1 hover:scale-110 transform"
              title="Сохранить как шаблон вопроса"
            >
              <FilePlus size={18} />
            </button>
            <button
              onClick={() => onEdit(question)}
              className="text-blue-500 hover:text-blue-700 transition-colors p-1 hover:scale-110 transform"
              title="Редактировать вопрос"
              disabled={isUpdating}
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => onDelete(question.id)}
              className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:scale-110 transform"
              title="Удалить вопрос"
              disabled={isDeleting}
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function QuestionBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const surveyId = parseInt(id!)
  const queryClient = useQueryClient()
  const textInputRef = useRef<HTMLInputElement>(null)

  // Получение данных опроса (включая статус)
  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => getSurvey(surveyId),
  })

  const { data: questions, isLoading: qLoading } = useQuery({
    queryKey: ['questions', surveyId],
    queryFn: () => getSurveyQuestions(surveyId),
    enabled: !!surveyId,
  })

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  })

  // Состояния для добавления вопроса
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

  // Состояния для редактирования
  const [editingQuestion, setEditingQuestion] = useState<{
    id: number
    text: string
    type: QuestionType
    required: boolean
    options: string[]
  } | null>(null)

  // Состояния для сохранения опроса как шаблона
  const [saveTemplateModal, setSaveTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  // Состояния для сохранения вопроса как шаблона
  const [saveQuestionModal, setSaveQuestionModal] = useState<{
    isOpen: boolean
    questionId?: number
    currentText?: string
  }>({ isOpen: false })
  const [questionTemplateName, setQuestionTemplateName] = useState('')
  const [isSavingQuestionTemplate, setIsSavingQuestionTemplate] = useState(false)

  const isDraft = survey?.status === 'Draft'

  // Настройка сенсоров для DnD
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Мутации
  const addMutation = useMutation({
    mutationFn: (dto: CreateQuestionDto) => addQuestion(surveyId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', surveyId] })
      resetForm()
      toast.success('Вопрос добавлен')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось добавить вопрос'
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

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateQuestionDto }) =>
      updateQuestion(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', surveyId] })
      setEditingQuestion(null)
      toast.success('Вопрос обновлён')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось обновить вопрос'
      toast.error(message)
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (orders: UpdateQuestionOrderDto[]) => updateQuestionsOrder(surveyId, orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', surveyId] })
      toast.success('Порядок вопросов обновлён')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось обновить порядок'
      toast.error(message)
    },
  })

  // Валидация формы добавления
  const validateAdd = (): boolean => {
    const newErrors: { text?: string; options?: string } = {}
    if (!text.trim()) newErrors.text = 'Пожалуйста, введите текст вопроса'
    if (type === QuestionType.SingleChoice) {
      const validOptions = options.filter((o) => o.trim() !== '')
      if (validOptions.length < 2) newErrors.options = 'Добавьте как минимум 2 варианта ответа'
      else if (options.some((o) => o.trim() === '')) newErrors.options = 'Все варианты должны быть заполнены'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Валидация формы редактирования
  const validateEdit = (): boolean => {
    if (!editingQuestion) return false
    const newErrors: { text?: string; options?: string } = {}
    if (!editingQuestion.text.trim()) newErrors.text = 'Пожалуйста, введите текст вопроса'
    if (editingQuestion.type === QuestionType.SingleChoice) {
      const validOptions = editingQuestion.options.filter((o) => o.trim() !== '')
      if (validOptions.length < 2) newErrors.options = 'Добавьте как минимум 2 варианта ответа'
      else if (editingQuestion.options.some((o) => o.trim() === '')) newErrors.options = 'Все варианты должны быть заполнены'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setText('')
    setOptions([])
    setSelectedTemplate('')
    setErrors({})
  }

  const handleAdd = () => {
    if (!isDraft) {
      toast.error('Нельзя добавлять вопросы в активный или завершённый опрос')
      return
    }
    if (!validateAdd()) return
    addMutation.mutate({
      text,
      type,
      required,
      order: (questions?.length || 0) + 1,
      options: type === QuestionType.SingleChoice && options.length > 0 ? options : undefined,
    })
  }

  // Обработчики для формы добавления
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    setErrors((prev) => ({ ...prev, text: undefined, general: undefined }))
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value as QuestionType)
    setErrors((prev) => ({ ...prev, options: undefined, general: undefined }))
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

  // Обработчики для редактирования
  const handleEditClick = (q: any) => {
    if (!isDraft) {
      toast.error('Нельзя редактировать вопросы в активном или завершённом опросе')
      return
    }
    setEditingQuestion({
      id: q.id,
      text: q.text,
      type: q.type,
      required: q.required,
      options: q.options || [],
    })
  }

  const handleEditSave = () => {
    if (!editingQuestion || !validateEdit()) return
    updateMutation.mutate({
      id: editingQuestion.id,
      dto: {
        text: editingQuestion.text,
        type: editingQuestion.type,
        required: editingQuestion.required,
        options:
          editingQuestion.type === QuestionType.SingleChoice && editingQuestion.options.length > 0
            ? editingQuestion.options
            : undefined,
      },
    })
  }

  const handleEditCancel = () => {
    setEditingQuestion(null)
    setErrors({})
  }

  const handleEditChange = (field: string, value: any) => {
    if (!editingQuestion) return
    setEditingQuestion({ ...editingQuestion, [field]: value })
    setErrors({})
  }

  const addEditOption = () => {
    if (!editingQuestion) return
    setEditingQuestion({
      ...editingQuestion,
      options: [...editingQuestion.options, ''],
    })
  }

  const removeEditOption = (index: number) => {
    if (!editingQuestion) return
    setEditingQuestion({
      ...editingQuestion,
      options: editingQuestion.options.filter((_, i) => i !== index),
    })
  }

  const updateEditOption = (index: number, value: string) => {
    if (!editingQuestion) return
    const newOptions = [...editingQuestion.options]
    newOptions[index] = value
    setEditingQuestion({
      ...editingQuestion,
      options: newOptions,
    })
  }

  // Обработчик окончания перетаскивания
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    if (!questions) return

    const oldIndex = questions.findIndex((q) => q.id === active.id)
    const newIndex = questions.findIndex((q) => q.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newQuestions = arrayMove([...questions], oldIndex, newIndex)

    // Формируем массив для отправки
    const orders: UpdateQuestionOrderDto[] = newQuestions.map((q, idx) => ({
      id: q.id,
      order: idx + 1,
    }))

    // Оптимистично обновляем UI
    queryClient.setQueryData(['questions', surveyId], newQuestions)

    // Отправляем запрос
    reorderMutation.mutate(orders)
  }

  // Сохранение опроса как шаблона
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Введите название шаблона')
      return
    }
    setIsSavingTemplate(true)
    try {
      await saveSurveyAsTemplate(surveyId, { name: templateName, description: templateDescription })
      toast.success('Шаблон успешно создан!')
      setSaveTemplateModal(false)
      setTemplateName('')
      setTemplateDescription('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка сохранения шаблона')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  // Сохранение вопроса как шаблона
  const handleSaveQuestionTemplateClick = (id: number, text: string) => {
    setSaveQuestionModal({ isOpen: true, questionId: id, currentText: text })
    setQuestionTemplateName('')
  }

  const handleSaveQuestionTemplate = async () => {
    if (!questionTemplateName.trim()) {
      toast.error('Введите название шаблона')
      return
    }
    if (!saveQuestionModal.questionId) return

    setIsSavingQuestionTemplate(true)
    try {
      await saveQuestionAsTemplate(saveQuestionModal.questionId, questionTemplateName)
      toast.success('Шаблон вопроса создан!')
      setSaveQuestionModal({ isOpen: false })
      setQuestionTemplateName('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка сохранения шаблона')
    } finally {
      setIsSavingQuestionTemplate(false)
    }
  }

  if (surveyLoading || qLoading) {
    return (
      <LogoLoader />
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

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-directum-dark">Вопросы опроса</h1>
        <span
          className={`text-sm px-3 py-1 rounded-full font-medium ${
            isDraft
              ? 'bg-gray-100 text-gray-600'
              : survey?.status === 'Active'
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {isDraft ? 'Черновик' : survey?.status === 'Active' ? 'Активен' : 'Завершён'}
        </span>
      </div>

      {!isDraft && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
          ⚠️ Опрос {survey?.status === 'Active' ? 'активен' : 'завершён'}. Вы не можете добавлять или
          редактировать вопросы.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Форма добавления (только для Draft) */}
        <div className="lg:col-span-1">
          <div className="card animate-fadeInUp">
            <h2 className="text-xl font-semibold text-directum-dark mb-4">Добавить вопрос</h2>

            {!isDraft ? (
              <div className="text-sm text-gray-500 text-center py-4">Добавление вопросов недоступно</div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Кнопка перехода к матрице */}
          <button
            onClick={() => navigate(`/survey/${surveyId}/matrix`)}
            className="btn-primary w-full flex items-center justify-center space-x-2 animate-fadeInUp mt-6"
          >
            <ArrowRight size={18} />
            <span>Перейти к матрице</span>
          </button>
        </div>

        {/* Список вопросов */}
        <div className="lg:col-span-2">
          <div className="card animate-fadeInUp">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-xl font-semibold text-directum-dark">Вопросы опроса</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{questions?.length || 0} вопросов</span>
                {isDraft && (
                  <button
                    onClick={() => setSaveTemplateModal(true)}
                    className="btn-secondary text-sm flex items-center space-x-1 px-3 py-1"
                  >
                    <FileText size={16} />
                    <span>Сохранить опрос как шаблон</span>
                  </button>
                )}
              </div>
            </div>

            {questions?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>В опросе пока нет вопросов</p>
                <p className="text-sm">Добавьте первый вопрос с помощью формы слева</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {questions
                    ?.sort((a, b) => a.order - b.order)
                    .map((q, index) => (
                      <SortableQuestionItem
                        key={q.id}
                        question={q}
                        index={index}
                        isDraft={isDraft}
                        onEdit={handleEditClick}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onSaveAsTemplate={handleSaveQuestionTemplateClick}
                        isDeleting={deleteMutation.isPending}
                        isUpdating={updateMutation.isPending}
                      />
                    ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full animate-fadeInUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-directum-dark">Редактирование вопроса</h3>
              <button
                onClick={handleEditCancel}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XCircle size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {errors.general}
                </div>
              )}

              <div>
                <label className="label-field">Текст вопроса *</label>
                <input
                  type="text"
                  value={editingQuestion.text}
                  onChange={(e) => handleEditChange('text', e.target.value)}
                  className={`input-field ${errors.text ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {errors.text && <p className="text-red-500 text-sm mt-1">{errors.text}</p>}
              </div>

              <div>
                <label className="label-field">Тип вопроса</label>
                <select
                  value={editingQuestion.type}
                  onChange={(e) => handleEditChange('type', e.target.value as QuestionType)}
                  className="input-field"
                >
                  <option value={QuestionType.Text}>Текстовый ответ</option>
                  <option value={QuestionType.SingleChoice}>Выбор одного варианта</option>
                </select>
              </div>

              {editingQuestion.type === QuestionType.SingleChoice && (
                <div className="space-y-2">
                  <label className="label-field">Варианты ответов *</label>
                  <div className="space-y-2">
                    {editingQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateEditOption(index, e.target.value)}
                          className={`input-field flex-1 ${errors.options ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder={`Вариант ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeEditOption(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {errors.options && <p className="text-red-500 text-sm mt-1">{errors.options}</p>}
                  <button
                    type="button"
                    onClick={addEditOption}
                    className="text-sm text-directum-orange hover:underline flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Добавить вариант
                  </button>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-required"
                  checked={editingQuestion.required}
                  onChange={(e) => handleEditChange('required', e.target.checked)}
                  className="w-4 h-4 text-directum-orange rounded border-gray-300 focus:ring-directum-orange"
                />
                <label htmlFor="edit-required" className="ml-2 text-sm text-gray-700">
                  Обязательный вопрос
                </label>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleEditSave}
                  className="btn-primary flex-1 flex items-center justify-center space-x-2"
                  disabled={updateMutation.isPending}
                >
                  <Save size={18} />
                  <span>{updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
                <button
                  onClick={handleEditCancel}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно сохранения опроса как шаблона */}
      {saveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeInUp">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-directum-dark">Сохранить опрос как шаблон</h3>
              <button
                onClick={() => {
                  setSaveTemplateModal(false)
                  setTemplateName('')
                  setTemplateDescription('')
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-field">Название шаблона *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="input-field"
                  placeholder="Введите название"
                  autoFocus
                />
              </div>
              <div>
                <label className="label-field">Описание</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Описание шаблона (необязательно)"
                />
              </div>
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveTemplate}
                  className="btn-primary flex-1"
                  disabled={isSavingTemplate}
                >
                  {isSavingTemplate ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  onClick={() => {
                    setSaveTemplateModal(false)
                    setTemplateName('')
                    setTemplateDescription('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно сохранения вопроса как шаблона */}
      {saveQuestionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeInUp">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-directum-dark">Сохранить вопрос как шаблон</h3>
              <button
                onClick={() => setSaveQuestionModal({ isOpen: false })}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-field">Название шаблона *</label>
                <input
                  type="text"
                  value={questionTemplateName}
                  onChange={(e) => setQuestionTemplateName(e.target.value)}
                  className="input-field"
                  placeholder="Введите название"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Вопрос: {saveQuestionModal.currentText}</p>
              </div>
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveQuestionTemplate}
                  className="btn-primary flex-1"
                  disabled={isSavingQuestionTemplate}
                >
                  {isSavingQuestionTemplate ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  onClick={() => setSaveQuestionModal({ isOpen: false })}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}