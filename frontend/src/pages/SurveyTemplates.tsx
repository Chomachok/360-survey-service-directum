import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSurveyTemplates, createSurveyTemplate, updateSurveyTemplate, deleteSurveyTemplate } from '../api/surveyTemplates'
import { useState, useRef } from 'react' // убрали useEffect
import { QuestionType, CreateSurveyTemplateDto, CreateTemplateQuestionDto } from '../types'
import { Plus, Copy, Edit, Trash2, X, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '../components/ConfirmModal'

const generateTempId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)

export default function SurveyTemplates() {
  const queryClient = useQueryClient()
  const { data: templates, isLoading } = useQuery({
    queryKey: ['surveyTemplates'],
    queryFn: getSurveyTemplates,
  })

  // Состояния для формы создания
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createQuestions, setCreateQuestions] = useState<CreateTemplateQuestionDto[]>([])
  const [createErrors, setCreateErrors] = useState<{ name?: string; questions?: string }>({})

  // Редактирование
  const [editingTemplate, setEditingTemplate] = useState<{
    id: number
    name: string
    description: string
    questions: CreateTemplateQuestionDto[]
  } | null>(null)
  const [editErrors, setEditErrors] = useState<{ name?: string; questions?: string }>({})

  // Просмотр
  const [viewingTemplate, setViewingTemplate] = useState<any | null>(null)

  // Удаление
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id?: number; name?: string }>({ isOpen: false })

  // Реф для предотвращения двойного нажатия
  const isCreatingRef = useRef(false)

  // Сброс формы создания
  const resetCreateForm = () => {
    setCreateName('')
    setCreateDescription('')
    setCreateQuestions([])
    setCreateErrors({})
  }

  // Открытие формы создания
  const openCreateForm = () => {
    resetCreateForm()
    setIsCreateFormOpen(true)
  }

  const closeCreateForm = () => {
    resetCreateForm()
    setIsCreateFormOpen(false)
    isCreatingRef.current = false
  }

  // Мутации
  const createMutation = useMutation({
    mutationFn: (dto: CreateSurveyTemplateDto) => {
      // Удаляем временные ID перед отправкой
      const cleanQuestions = dto.questions.map(({ tempId, ...rest }) => rest)
      return createSurveyTemplate({ ...dto, questions: cleanQuestions })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveyTemplates'] })
      closeCreateForm()
      toast.success('Шаблон опроса создан')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка создания')
      isCreatingRef.current = false
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) => {
      const cleanQuestions = dto.questions.map(({ tempId, ...rest }: any) => rest)
      return updateSurveyTemplate(id, { ...dto, questions: cleanQuestions })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveyTemplates'] })
      setEditingTemplate(null)
      toast.success('Шаблон обновлён')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка обновления')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSurveyTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveyTemplates'] })
      setDeleteModal({ isOpen: false })
      toast.success('Шаблон удалён')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка удаления')
    },
  })

  // Обработчик отправки формы создания
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isCreatingRef.current) return
    if (!createName.trim()) {
      setCreateErrors({ name: 'Введите название' })
      return
    }
    if (createQuestions.length === 0) {
      setCreateErrors({ questions: 'Добавьте хотя бы один вопрос' })
      return
    }
    for (const q of createQuestions) {
      if (q.type === QuestionType.SingleChoice && (!q.options || q.options.length < 2)) {
        toast.error('Для вопроса с выбором добавьте минимум 2 варианта')
        return
      }
    }
    isCreatingRef.current = true
    createMutation.mutate({ name: createName, description: createDescription, questions: createQuestions })
  }

  // ----- Функции для работы с вопросами в форме создания -----
  const addQuestionToCreate = () => {
    setCreateQuestions([
      ...createQuestions,
      {
        tempId: generateTempId(),
        text: '',
        type: QuestionType.Text,
        required: false,
        order: createQuestions.length + 1,
        options: [],
      },
    ])
    setCreateErrors({})
  }

  const removeQuestionFromCreate = (index: number) => {
    setCreateQuestions(createQuestions.filter((_, i) => i !== index))
    setCreateErrors({})
  }

  const updateQuestionInCreate = (index: number, field: keyof CreateTemplateQuestionDto, value: any) => {
    const updated = [...createQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setCreateQuestions(updated)
    setCreateErrors({})
  }

  const addOptionToCreate = (qIndex: number) => {
    const updated = [...createQuestions]
    const q = updated[qIndex]
    if (!q.options) q.options = []
    q.options.push('')
    setCreateQuestions(updated)
  }

  const removeOptionFromCreate = (qIndex: number, optIndex: number) => {
    const updated = [...createQuestions]
    const q = updated[qIndex]
    if (q.options) {
      q.options = q.options.filter((_, i) => i !== optIndex)
      setCreateQuestions(updated)
    }
  }

  const updateOptionInCreate = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...createQuestions]
    const q = updated[qIndex]
    if (q.options && q.options[optIndex] !== undefined) {
      q.options[optIndex] = value
      setCreateQuestions(updated)
    }
  }

  // ----- Функции для редактирования -----
  const handleEditClick = (template: any) => {
    setEditingTemplate({
      id: template.id,
      name: template.name,
      description: template.description || '',
      questions: template.questions.map((q: any) => ({
        tempId: generateTempId(),
        text: q.text,
        type: q.type,
        required: q.required,
        order: q.order,
        options: q.options || [],
      })),
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate) return
    if (!editingTemplate.name.trim()) {
      setEditErrors({ name: 'Введите название' })
      return
    }
    if (editingTemplate.questions.length === 0) {
      setEditErrors({ questions: 'Добавьте хотя бы один вопрос' })
      return
    }
    for (const q of editingTemplate.questions) {
      if (q.type === QuestionType.SingleChoice && (!q.options || q.options.length < 2)) {
        toast.error('Для вопроса с выбором добавьте минимум 2 варианта')
        return
      }
    }
    updateMutation.mutate({
      id: editingTemplate.id,
      dto: {
        name: editingTemplate.name,
        description: editingTemplate.description,
        questions: editingTemplate.questions,
      },
    })
  }

  const addQuestionToEdit = () => {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      questions: [
        ...editingTemplate.questions,
        {
          tempId: generateTempId(),
          text: '',
          type: QuestionType.Text,
          required: false,
          order: editingTemplate.questions.length + 1,
          options: [],
        },
      ],
    })
    setEditErrors({})
  }

  const removeQuestionFromEdit = (index: number) => {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      questions: editingTemplate.questions.filter((_, i) => i !== index),
    })
    setEditErrors({})
  }

  const updateQuestionInEdit = (index: number, field: keyof CreateTemplateQuestionDto, value: any) => {
    if (!editingTemplate) return
    const updated = [...editingTemplate.questions]
    updated[index] = { ...updated[index], [field]: value }
    setEditingTemplate({ ...editingTemplate, questions: updated })
    setEditErrors({})
  }

  const addOptionToEdit = (qIndex: number) => {
    if (!editingTemplate) return
    const updated = [...editingTemplate.questions]
    const q = updated[qIndex]
    if (!q.options) q.options = []
    q.options.push('')
    setEditingTemplate({ ...editingTemplate, questions: updated })
  }

  const removeOptionFromEdit = (qIndex: number, optIndex: number) => {
    if (!editingTemplate) return
    const updated = [...editingTemplate.questions]
    const q = updated[qIndex]
    if (q.options) {
      q.options = q.options.filter((_, i) => i !== optIndex)
      setEditingTemplate({ ...editingTemplate, questions: updated })
    }
  }

  const updateOptionInEdit = (qIndex: number, optIndex: number, value: string) => {
    if (!editingTemplate) return
    const updated = [...editingTemplate.questions]
    const q = updated[qIndex]
    if (q.options && q.options[optIndex] !== undefined) {
      q.options[optIndex] = value
      setEditingTemplate({ ...editingTemplate, questions: updated })
    }
  }

  const handleViewClick = (template: any) => {
    setViewingTemplate(template)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-directum-orange border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="animate-fadeInUp mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-directum-dark">Шаблоны опросов</h1>
          <p className="mt-1 text-gray-500">Создавайте готовые наборы вопросов для быстрого запуска опросов</p>
        </div>
        <button onClick={openCreateForm} className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Создать шаблон</span>
        </button>
      </div>

      {/* Форма создания */}
      {isCreateFormOpen && (
        <div className="card mb-6 animate-fadeInUp">
          <h2 className="text-xl font-semibold text-directum-dark mb-4">Новый шаблон опроса</h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="label-field">Название *</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => { setCreateName(e.target.value); setCreateErrors({}) }}
                className={`input-field ${createErrors.name ? 'border-red-500' : ''}`}
              />
              {createErrors.name && <p className="text-red-500 text-sm">{createErrors.name}</p>}
            </div>
            <div>
              <label className="label-field">Описание</label>
              <textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                className="input-field resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="label-field">Вопросы *</label>
              {createQuestions.map((q, idx) => (
                <div key={q.tempId || idx} className="flex flex-col gap-2 p-3 border rounded-lg mb-2 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Вопрос #{idx + 1}</span>
                    <button type="button" onClick={() => removeQuestionFromCreate(idx)} className="text-red-500 hover:text-red-700">
                      <X size={18} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Текст вопроса"
                    value={q.text}
                    onChange={(e) => updateQuestionInCreate(idx, 'text', e.target.value)}
                    className="input-field"
                  />
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestionInCreate(idx, 'type', e.target.value)}
                      className="input-field w-1/2"
                    >
                      <option value={QuestionType.Text}>Текст</option>
                      <option value={QuestionType.SingleChoice}>Выбор</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => updateQuestionInCreate(idx, 'required', e.target.checked)}
                      />
                      Обязательный
                    </label>
                  </div>
                  {q.type === QuestionType.SingleChoice && (
                    <div className="space-y-1">
                      <label className="text-sm text-gray-600">Варианты ответа:</label>
                      {(q.options ?? []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOptionInCreate(idx, optIdx, e.target.value)}
                            className="input-field flex-1"
                            placeholder={`Вариант ${optIdx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeOptionFromCreate(idx, optIdx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOptionToCreate(idx)}
                        className="text-directum-orange hover:underline text-sm flex items-center gap-1"
                      >
                        <Plus size={14} /> Добавить вариант
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {createErrors.questions && <p className="text-red-500 text-sm">{createErrors.questions}</p>}
              <button type="button" onClick={addQuestionToCreate} className="text-directum-orange hover:underline text-sm flex items-center gap-1">
                <Plus size={16} /> Добавить вопрос
              </button>
            </div>
            <div className="flex space-x-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Создание...' : 'Сохранить'}
              </button>
              <button type="button" onClick={closeCreateForm} className="btn-secondary flex-1">
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Список шаблонов */}
      {templates?.length === 0 ? (
        <div className="card text-center py-12">
          <Copy size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Шаблонов опросов пока нет</p>
          <button onClick={openCreateForm} className="btn-primary inline-block mt-4">
            Создать первый шаблон
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates?.map((t, index) => (
            <div
              key={t.id}
              className="card animate-fadeInUp"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-directum-dark">{t.name}</h3>
                  {t.description && <p className="mt-1 text-sm text-gray-500">{t.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{t.questions.length} вопросов</p>
                </div>
                <div className="ml-3 flex shrink-0 items-center space-x-1">
                  <button onClick={() => handleViewClick(t)} className="p-1 text-gray-400 transition-colors hover:text-blue-500" title="Просмотр">
                    <Eye size={18} />
                  </button>
                  <button onClick={() => handleEditClick(t)} className="p-1 text-gray-400 transition-colors hover:text-directum-orange" title="Редактировать">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => setDeleteModal({ isOpen: true, id: t.id, name: t.name })} className="p-1 text-gray-400 transition-colors hover:text-red-500" title="Удалить">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка редактирования */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeInUp">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Редактирование шаблона</h3>
              <button onClick={() => setEditingTemplate(null)}><X size={24} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="label-field">Название *</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className={`input-field ${editErrors.name ? 'border-red-500' : ''}`}
                />
                {editErrors.name && <p className="text-red-500 text-sm">{editErrors.name}</p>}
              </div>
              <div>
                <label className="label-field">Описание</label>
                <textarea
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="input-field resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="label-field">Вопросы</label>
                {editingTemplate.questions.map((q, idx) => (
                  <div key={q.tempId || idx} className="flex flex-col gap-2 p-3 border rounded-lg mb-2 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Вопрос #{idx + 1}</span>
                      <button type="button" onClick={() => removeQuestionFromEdit(idx)} className="text-red-500 hover:text-red-700">
                        <X size={18} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Текст вопроса"
                      value={q.text}
                      onChange={(e) => updateQuestionInEdit(idx, 'text', e.target.value)}
                      className="input-field"
                    />
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestionInEdit(idx, 'type', e.target.value)}
                        className="input-field w-1/2"
                      >
                        <option value={QuestionType.Text}>Текст</option>
                        <option value={QuestionType.SingleChoice}>Выбор</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQuestionInEdit(idx, 'required', e.target.checked)}
                        />
                        Обязательный
                      </label>
                    </div>
                    {q.type === QuestionType.SingleChoice && (
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Варианты ответа:</label>
                        {(q.options ?? []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOptionInEdit(idx, optIdx, e.target.value)}
                              className="input-field flex-1"
                              placeholder={`Вариант ${optIdx + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeOptionFromEdit(idx, optIdx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOptionToEdit(idx)}
                          className="text-directum-orange hover:underline text-sm flex items-center gap-1"
                        >
                          <Plus size={14} /> Добавить вариант
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {editErrors.questions && <p className="text-red-500 text-sm">{editErrors.questions}</p>}
                <button type="button" onClick={addQuestionToEdit} className="text-directum-orange hover:underline text-sm flex items-center gap-1">
                  <Plus size={16} /> Добавить вопрос
                </button>
              </div>
              <div className="flex space-x-3 pt-4 border-t">
                <button type="submit" className="btn-primary flex-1" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button type="button" onClick={() => setEditingTemplate(null)} className="btn-secondary flex-1">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка просмотра */}
      {viewingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeInUp">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-directum-dark">{viewingTemplate.name}</h3>
                {viewingTemplate.description && <p className="text-sm text-gray-500 mt-1">{viewingTemplate.description}</p>}
              </div>
              <button onClick={() => setViewingTemplate(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">Вопросов: {viewingTemplate.questions.length}</p>
              {viewingTemplate.questions.map((q: any, idx: number) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex-1">
                    <p className="font-medium text-directum-dark">
                      {idx + 1}. {q.text}
                      {q.required && <span className="text-red-500 ml-1 text-sm">*</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                        {q.type === QuestionType.Text ? 'Текст' : 'Выбор'}
                      </span>
                      {q.options && q.options.length > 0 && (
                        <span className="text-xs text-gray-500">
                          Варианты: {q.options.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setViewingTemplate(null)} className="btn-secondary">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={() => deleteModal.id && deleteMutation.mutate(deleteModal.id)}
        title="Удаление шаблона"
        message={`Удалить шаблон «${deleteModal.name}»? Уже созданные матрицы опросов это не затронет.`}
        confirmText="Удалить"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}