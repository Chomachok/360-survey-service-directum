import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Users, X, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getRespondentTemplates,
  createRespondentTemplate,
  updateRespondentTemplate,
  deleteRespondentTemplate,
} from '../api/respondentTemplates'
import { getEmployees } from '../api/employees'
import type { RespondentTemplate, CreateRespondentTemplateItemDto } from '../types'
import { ConfirmModal } from '../components/ConfirmModal'

/** пустая строка состава по умолчанию */
const emptyItem = (): CreateRespondentTemplateItemDto => ({
  employeeId: -1,
})

export default function RespondentTemplates() {
  const queryClient = useQueryClient()

  const { data: templates, isLoading } = useQuery({
    queryKey: ['respondent-templates'],
    queryFn: getRespondentTemplates,
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  })

  // ---------- состояние редактора ----------
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<CreateRespondentTemplateItemDto[]>([emptyItem()])

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id?: number; name?: string }>({
    isOpen: false,
  })

  const resetEditor = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setItems([emptyItem()])
  }

  const openCreate = () => {
    resetEditor()
    setEditorOpen(true)
  }

  const openEdit = (t: RespondentTemplate) => {
    setEditingId(t.id)
    setName(t.name)
    setDescription(t.description ?? '')
    setItems(
      t.items.length
        ? t.items.map((i) => ({ employeeId: i.employeeId ?? -1 }))
        : [emptyItem()],
    )
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    resetEditor()
  }

  // ---------- мутации ----------
  const saveMutation = useMutation({
    mutationFn: () => {
      const dto = {
        name: name.trim(),
        description: description.trim() || undefined,
        items: items.map((i) => ({
          employeeId: i.employeeId,
        })),
      }
      return editingId ? updateRespondentTemplate(editingId, dto) : createRespondentTemplate(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respondent-templates'] })
      toast.success(editingId ? 'Шаблон обновлён' : 'Шаблон создан')
      closeEditor()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Не удалось сохранить шаблон')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRespondentTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respondent-templates'] })
      toast.success('Шаблон удалён')
      setDeleteModal({ isOpen: false })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Не удалось удалить шаблон')
      setDeleteModal({ isOpen: false })
    },
  })

  // ---------- валидация формы ----------
  const duplicateEmployees = items
    .map((i) => i.employeeId)
    .filter((id) => id !== null)
    .some((id, index, arr) => arr.indexOf(id) !== index)

  const missingEmployee = items.some((i) => i.employeeId === null)
  const canSave = name.trim().length > 0 && items.length > 0 && !missingEmployee && !duplicateEmployees

  const updateItem = (index: number, patch: Partial<CreateRespondentTemplateItemDto>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
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
          <h1 className="text-3xl font-bold text-directum-dark">Шаблоны респондентов</h1>
          <p className="mt-1 text-gray-500">
            Заранее описанный состав оценивающих. Один шаблон подходит любому оцениваемому.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Создать шаблон</span>
        </button>
      </div>

      {templates?.length === 0 ? (
        <div className="card animate-fadeInUp py-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Шаблонов пока нет</p>
          <button onClick={openCreate} className="btn-secondary mt-4 inline-block">
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
                </div>
                <div className="ml-3 flex shrink-0 items-center space-x-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1 text-gray-400 transition-colors hover:text-directum-orange"
                    title="Редактировать"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteModal({ isOpen: true, id: t.id, name: t.name })}
                    className="p-1 text-gray-400 transition-colors hover:text-red-500"
                    title="Удалить"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {t.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <UserCheck size={15} className="text-gray-400" />
                      {item.employeeName || 'Неизвестно'}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-gray-400">
                Респондентов: {t.items.length}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ---------- редактор ---------- */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEditor} />

          <div className="animate-fadeInUp relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-directum-dark dark:text-white">
                {editingId ? 'Редактирование шаблона' : 'Новый шаблон респондентов'}
              </h3>
              <button
                onClick={closeEditor}
                className="rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="label-field">Название</label>
                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Классическая 360"
                />
              </div>

              <div>
                <label className="label-field">Описание (необязательно)</label>
                <input
                  className="input-field"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Кратко, для чего этот состав"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="label-field mb-0">Состав респондентов</label>
                  <button
                    onClick={() => setItems((prev) => [...prev, emptyItem()])}
                    className="flex items-center gap-1 text-sm text-directum-orange hover:underline"
                  >
                    <Plus size={14} />
                    Добавить
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={item.employeeId ?? ''}
                        onChange={(e) =>
                          updateItem(index, {
                            employeeId: e.target.value === '' ? -1 : Number(e.target.value),
                          })
                        }
                        className="input-field flex-1"
                      >
                        <option value="">Выберите сотрудника</option>
                        {employees?.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.fullName}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                        className="p-1 text-gray-400 transition-colors hover:text-red-500 disabled:opacity-30"
                        title="Убрать"
                        disabled={items.length === 1}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                {missingEmployee && (
                  <p className="mt-2 text-sm text-red-500">
                    У каждого респондента должен быть выбран сотрудник
                  </p>
                )}
                {duplicateEmployees && (
                  <p className="mt-2 text-sm text-red-500">
                    Один сотрудник не может быть добавлен дважды
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
              <button
                onClick={closeEditor}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
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