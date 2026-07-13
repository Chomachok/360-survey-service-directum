import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/questions'
import { useState } from 'react'
import { QuestionType, CreateQuestionTemplateDto, UpdateQuestionTemplateDto } from '../types'
import { Plus, Copy, Edit, Trash2, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '../components/ConfirmModal'

export default function Templates() {
  const queryClient = useQueryClient()

  // --- Список шаблонов ---
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  })

  // --- Состояния для создания ---
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [type, setType] = useState<QuestionType>(QuestionType.Text)
  const [options, setOptions] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [createErrors, setCreateErrors] = useState<{
    name?: string
    text?: string
    options?: string
  }>({})

  // --- Состояния для редактирования ---
  const [editingTemplate, setEditingTemplate] = useState<{
    id: number
    name: string
    text: string
    type: QuestionType
    options: string[]
  } | null>(null)
  const [editErrors, setEditErrors] = useState<{
    name?: string
    text?: string
    options?: string
  }>({})

  // --- Состояния для удаления ---
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id?: number
    name?: string
  }>({ isOpen: false })

  // --- Мутации ---

  const createMutation = useMutation({
    mutationFn: (dto: CreateQuestionTemplateDto) => createTemplate(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setName('')
      setText('')
      setOptions([])
      setShowForm(false)
      setCreateErrors({})
      toast.success('Шаблон успешно создан!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось создать шаблон'
      toast.error(message)
      // не сохраняем general в createErrors
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateQuestionTemplateDto }) =>
      updateTemplate(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setEditingTemplate(null)
      setEditErrors({})
      toast.success('Шаблон успешно обновлён!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось обновить шаблон'
      toast.error(message)
      // не сохраняем general в editErrors
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setDeleteModal({ isOpen: false })
      toast.success('Шаблон успешно удалён')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось удалить шаблон'
      toast.error(message)
      setDeleteModal({ isOpen: false })
    },
  })

  // --- Валидация создания ---
  const validateCreate = (): boolean => {
    const errors: { name?: string; text?: string; options?: string } = {}
    if (!name.trim()) errors.name = 'Введите название шаблона'
    if (!text.trim()) errors.text = 'Введите текст вопроса'
    if (type === QuestionType.SingleChoice) {
      const validOptions = options.filter(o => o.trim() !== '')
      if (validOptions.length < 2) {
        errors.options = 'Добавьте как минимум 2 варианта ответа'
      } else if (options.some(o => o.trim() === '')) {
        errors.options = 'Все варианты должны быть заполнены'
      }
    }
    setCreateErrors(errors)
    return Object.keys(errors).length === 0
  }

  // --- Валидация редактирования ---
  const validateEdit = (): boolean => {
    if (!editingTemplate) return false
    const errors: { name?: string; text?: string; options?: string } = {}
    if (!editingTemplate.name.trim()) errors.name = 'Введите название шаблона'
    if (!editingTemplate.text.trim()) errors.text = 'Введите текст вопроса'
    if (editingTemplate.type === QuestionType.SingleChoice) {
      const validOptions = editingTemplate.options.filter(o => o.trim() !== '')
      if (validOptions.length < 2) {
        errors.options = 'Добавьте как минимум 2 варианта ответа'
      } else if (editingTemplate.options.some(o => o.trim() === '')) {
        errors.options = 'Все варианты должны быть заполнены'
      }
    }
    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  // --- Обработчики ---

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateCreate()) return
    createMutation.mutate({
      name,
      text,
      type,
      options: type === QuestionType.SingleChoice && options.length > 0 ? options : undefined,
    })
  }

  const handleEditClick = (template: any) => {
    setEditingTemplate({
      id: template.id,
      name: template.name,
      text: template.text,
      type: template.type,
      options: template.options || [],
    })
    setEditErrors({})
  }

  const handleEditCancel = () => {
    setEditingTemplate(null)
    setEditErrors({})
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEdit()) return
    updateMutation.mutate({
      id: editingTemplate!.id,
      dto: {
        name: editingTemplate!.name,
        text: editingTemplate!.text,
        type: editingTemplate!.type,
        options: editingTemplate!.type === QuestionType.SingleChoice && editingTemplate!.options.length > 0
          ? editingTemplate!.options
          : undefined,
      },
    })
  }

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteModal({ isOpen: true, id, name })
  }

  // --- Вспомогательные функции для вариантов (создание) ---
  const addOption = () => {
    setOptions([...options, ''])
    setCreateErrors(prev => ({ ...prev, options: undefined }))
  }
  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
    setCreateErrors(prev => ({ ...prev, options: undefined }))
  }
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    setCreateErrors(prev => ({ ...prev, options: undefined }))
  }

  // --- Вспомогательные функции для вариантов (редактирование) ---
  const addEditOption = () => {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      options: [...editingTemplate.options, ''],
    })
    setEditErrors(prev => ({ ...prev, options: undefined }))
  }
  const removeEditOption = (index: number) => {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      options: editingTemplate.options.filter((_, i) => i !== index),
    })
    setEditErrors(prev => ({ ...prev, options: undefined }))
  }
  const updateEditOption = (index: number, value: string) => {
    if (!editingTemplate) return
    const newOptions = [...editingTemplate.options]
    newOptions[index] = value
    setEditingTemplate({ ...editingTemplate, options: newOptions })
    setEditErrors(prev => ({ ...prev, options: undefined }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-directum-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 animate-fadeInUp">
        <div>
          <h1 className="text-3xl font-bold text-directum-dark">Шаблоны вопросов</h1>
          <p className="text-gray-500 mt-1">Создавайте и управляйте шаблонами для быстрого добавления вопросов</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setCreateErrors({})
            if (!showForm) {
              setName('')
              setText('')
              setOptions([])
              setType(QuestionType.Text)
            }
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>{showForm ? 'Отменить' : 'Создать шаблон'}</span>
        </button>
      </div>

      {/* Форма создания */}
      {showForm && (
        <div className="card mb-6 animate-fadeInUp">
          <h2 className="text-xl font-semibold text-directum-dark mb-4">Новый шаблон</h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Название шаблона *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setCreateErrors(prev => ({ ...prev, name: undefined }))
                  }}
                  className={`input-field ${createErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Например: Оценка компетенций"
                />
                {createErrors.name && <p className="text-red-500 text-sm mt-1">{createErrors.name}</p>}
              </div>
              <div>
                <label className="label-field">Тип вопроса</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as QuestionType)
                    setCreateErrors(prev => ({ ...prev, options: undefined }))
                  }}
                  className="input-field"
                >
                  <option value={QuestionType.Text}>Текстовый ответ</option>
                  <option value={QuestionType.SingleChoice}>Выбор одного варианта</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label-field">Текст вопроса *</label>
              <input
                type="text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setCreateErrors(prev => ({ ...prev, text: undefined }))
                }}
                className={`input-field ${createErrors.text ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Введите текст вопроса"
              />
              {createErrors.text && <p className="text-red-500 text-sm mt-1">{createErrors.text}</p>}
            </div>

            {type === QuestionType.SingleChoice && (
              <div className="space-y-2">
                <label className="label-field">Варианты ответов *</label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className={`input-field flex-1 ${createErrors.options ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder={`Вариант ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                {createErrors.options && <p className="text-red-500 text-sm mt-1">{createErrors.options}</p>}
                <button
                  type="button"
                  onClick={addOption}
                  className="text-sm text-directum-orange hover:underline flex items-center gap-1"
                >
                  <Plus size={16} />
                  Добавить вариант
                </button>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Сохранить шаблон'}
            </button>
          </form>
        </div>
      )}

      {/* Список шаблонов */}
      {templates?.length === 0 ? (
        <div className="card text-center py-12 animate-fadeInUp">
          <Copy size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Шаблонов пока нет</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-block mt-4"
          >
            Создать первый шаблон
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates?.map((t) => (
            <div
              key={t.id}
              className="card hover:shadow-md transition-shadow animate-fadeInUp"
              style={{ animationDelay: `${t.id * 100}ms` }}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0 overflow-hidden">
                  <h3 className="font-semibold text-directum-dark break-words overflow-hidden">{t.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 break-words overflow-hidden">{t.text}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">
                      {t.type === QuestionType.Text ? 'Текст' : 'Выбор'}
                    </span>
                    {t.options && t.options.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {t.options.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleEditClick(t)}
                    className="text-blue-500 hover:text-blue-700 transition-colors p-1 hover:scale-110 transform"
                    title="Редактировать"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(t.id, t.name)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:scale-110 transform"
                    title="Удалить"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно редактирования */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full animate-fadeInUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-directum-dark">Редактирование шаблона</h3>
              <button
                onClick={handleEditCancel}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
              <div>
                <label className="label-field">Название шаблона *</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => {
                    setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    setEditErrors(prev => ({ ...prev, name: undefined }))
                  }}
                  className={`input-field ${editErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {editErrors.name && <p className="text-red-500 text-sm mt-1">{editErrors.name}</p>}
              </div>
              <div>
                <label className="label-field">Текст вопроса *</label>
                <input
                  type="text"
                  value={editingTemplate.text}
                  onChange={(e) => {
                    setEditingTemplate({ ...editingTemplate, text: e.target.value })
                    setEditErrors(prev => ({ ...prev, text: undefined }))
                  }}
                  className={`input-field ${editErrors.text ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {editErrors.text && <p className="text-red-500 text-sm mt-1">{editErrors.text}</p>}
              </div>
              <div>
                <label className="label-field">Тип вопроса</label>
                <select
                  value={editingTemplate.type}
                  onChange={(e) => {
                    setEditingTemplate({
                      ...editingTemplate,
                      type: e.target.value as QuestionType,
                    })
                    setEditErrors(prev => ({ ...prev, options: undefined }))
                  }}
                  className="input-field"
                >
                  <option value={QuestionType.Text}>Текстовый ответ</option>
                  <option value={QuestionType.SingleChoice}>Выбор одного варианта</option>
                </select>
              </div>

              {editingTemplate.type === QuestionType.SingleChoice && (
                <div className="space-y-2">
                  <label className="label-field">Варианты ответов *</label>
                  <div className="space-y-2">
                    {editingTemplate.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateEditOption(index, e.target.value)}
                          className={`input-field flex-1 ${editErrors.options ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                  {editErrors.options && <p className="text-red-500 text-sm mt-1">{editErrors.options}</p>}
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

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center space-x-2"
                  disabled={updateMutation.isPending}
                >
                  <Save size={18} />
                  <span>{updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleEditCancel}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={() => deleteModal.id && deleteMutation.mutate(deleteModal.id)}
        title="Удаление шаблона"
        message={`Вы уверены, что хотите удалить шаблон "${deleteModal.name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}