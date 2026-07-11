import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/questions'
import { useState } from 'react'
import { QuestionType, UpdateQuestionTemplateDto } from '../types'
import { Plus, Copy, Edit2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '../components/ConfirmModal'

export default function Templates() {
  const queryClient = useQueryClient()
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  })

  // Состояние для формы создания
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [type, setType] = useState<QuestionType>(QuestionType.Text)
  const [options, setOptions] = useState<string[]>([])

  // Состояние для редактирования
  const [editingTemplate, setEditingTemplate] = useState<{
    id: number
    name: string
    text: string
    type: QuestionType
    options: string[]
  } | null>(null)

  // Состояние для удаления
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id?: number
    name?: string
  }>({ isOpen: false })

  // Мутация создания
  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Шаблон создан')
      setName('')
      setText('')
      setOptions([])
      setShowForm(false)
    },
    onError: (error: any) => {
      const message = error.response?.data || error.message || 'Не удалось создать шаблон'
      toast.error(message)
    },
  })

  // Мутация обновления
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateQuestionTemplateDto }) =>
      updateTemplate(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Шаблон обновлён')
      setEditingTemplate(null)
    },
    onError: (error: any) => {
      const message = error.response?.data || error.message || 'Не удалось обновить шаблон'
      toast.error(message)
    },
  })

  // Мутация удаления
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Шаблон удалён')
      setDeleteModal({ isOpen: false })
    },
    onError: (error: any) => {
      const message = error.response?.data || error.message || 'Не удалось удалить шаблон'
      toast.error(message)
      setDeleteModal({ isOpen: false })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      name,
      text,
      type,
      options: type === QuestionType.SingleChoice ? options : undefined,
    })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate) return
    updateMutation.mutate({
      id: editingTemplate!.id,
      dto: {
        name: editingTemplate.name,
        text: editingTemplate.text,
        type: editingTemplate.type,
        options: editingTemplate.type === QuestionType.SingleChoice ? editingTemplate.options : undefined,
      },
    })
  }

  const handleDelete = (id: number, name: string) => {
    setDeleteModal({ isOpen: true, id, name })
  }

  const openEditModal = (template: any) => {
    setEditingTemplate({
      id: template.id,
      name: template.name,
      text: template.text,
      type: template.type,
      options: template.options || [],
    })
  }

  // Функции для работы с вариантами в форме создания
  const addOption = () => setOptions([...options, ''])
  const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index))
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  // Функции для работы с вариантами в редактировании
  const addEditOption = () => {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      options: [...editingTemplate.options, ''],
    })
  }
  const removeEditOption = (index: number) => {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      options: editingTemplate.options.filter((_, i) => i !== index),
    })
  }
  const updateEditOption = (index: number, value: string) => {
    if (!editingTemplate) return
    const newOptions = [...editingTemplate.options]
    newOptions[index] = value
    setEditingTemplate({ ...editingTemplate, options: newOptions })
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
          <p className="text-gray-500 mt-1">Создавайте, редактируйте и удаляйте шаблоны для быстрого добавления вопросов</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Название шаблона *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Например: Оценка компетенций"
                  required
                />
              </div>
              <div>
                <label className="label-field">Тип вопроса</label>
                <select
                  value={type}
                  onChange={(e) => setType(Number(e.target.value) as QuestionType)}
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
                onChange={(e) => setText(e.target.value)}
                className="input-field"
                placeholder="Введите текст вопроса"
                required
              />
            </div>

            {type === QuestionType.SingleChoice && (
              <div className="space-y-2">
                <label className="label-field">Варианты ответов</label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="input-field flex-1"
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

            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
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
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-directum-dark">{t.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{t.text}</p>
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
                <div className="flex space-x-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => openEditModal(t)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors hover:scale-110 transform"
                    title="Редактировать"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.name)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors hover:scale-110 transform"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingTemplate(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full animate-fadeInUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-directum-dark dark:text-white">
                Редактировать шаблон
              </h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Название шаблона *</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Тип вопроса</label>
                  <select
                    value={editingTemplate.type}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        type: Number(e.target.value) as QuestionType,
                      })
                    }
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
                  value={editingTemplate.text}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, text: e.target.value })
                  }
                  className="input-field"
                  required
                />
              </div>

              {editingTemplate.type === QuestionType.SingleChoice && (
                <div className="space-y-2">
                  <label className="label-field">Варианты ответов</label>
                  <div className="space-y-2">
                    {editingTemplate.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateEditOption(index, e.target.value)}
                          className="input-field flex-1"
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

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
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