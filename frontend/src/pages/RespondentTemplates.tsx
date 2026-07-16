import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, X, UserCheck, Target, Boxes, List, Grid3x3 } from 'lucide-react'
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
import LogoLoader from '../components/LogoLoader'
import { SurveyMatrix } from '../components/MatrixGrid'

/** пустая строка состава по умолчанию */
const emptyItem = (): CreateRespondentTemplateItemDto => ({
  employeeId: -1,
})

/** пустая строка оцениваемого по умолчанию */
const emptyTarget = (): { employeeId: number } => ({
  employeeId: -1,
})

type ViewMode = 'list' | 'matrix'

// заглушки, которые никогда не сработают: превью-матрица всегда read-only
const noop = () => {}
const dummyDeleteMutation = { mutateAsync: async () => {} }

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

  const employeeNameById = useMemo(() => {
    const map = new Map<number, string>()
    employees?.forEach((e) => map.set(e.id, e.fullName))
    return map
  }, [employees])

  // ---------- отображение страницы: список групп / общая матрица ----------
  const [pageView, setPageView] = useState<ViewMode>('list')

  // ---------- состояние редактора ----------
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorView, setEditorView] = useState<ViewMode>('list')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<CreateRespondentTemplateItemDto[]>([emptyItem()])
  const [targetRows, setTargetRows] = useState<{ employeeId: number }[]>([])

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id?: number; name?: string }>({
    isOpen: false,
  })

  const resetEditor = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setItems([emptyItem()])
    setTargetRows([])
    setEditorView('list')
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
    setTargetRows(t.targets.map((tg) => ({ employeeId: tg.employeeId })))
    setEditorView('list')
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
        targetEmployeeIds: targetRows.map((t) => t.employeeId),
      }
      return editingId ? updateRespondentTemplate(editingId, dto) : createRespondentTemplate(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respondent-templates'] })
      toast.success(editingId ? 'Группа обновлена' : 'Группа создана')
      closeEditor()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Не удалось сохранить группу')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRespondentTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respondent-templates'] })
      toast.success('Группа удалена')
      setDeleteModal({ isOpen: false })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Не удалось удалить группу')
      setDeleteModal({ isOpen: false })
    },
  })

  // ---------- валидация формы ----------
  const duplicateEmployees = items
    .map((i) => i.employeeId)
    .filter((id) => id !== null && id !== -1)
    .some((id, index, arr) => arr.indexOf(id) !== index)

  const missingEmployee = items.some((i) => i.employeeId === null || i.employeeId === -1)

  const duplicateTargets = targetRows
    .map((t) => t.employeeId)
    .filter((id) => id !== -1)
    .some((id, index, arr) => arr.indexOf(id) !== index)

  const missingTarget = targetRows.some((t) => t.employeeId === -1)

  const canSave =
    name.trim().length > 0 &&
    items.length > 0 &&
    !missingEmployee &&
    !duplicateEmployees &&
    !missingTarget &&
    !duplicateTargets

  const updateItem = (index: number, patch: Partial<CreateRespondentTemplateItemDto>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const updateTargetRow = (index: number, employeeId: number) => {
    setTargetRows((prev) => prev.map((t, i) => (i === index ? { employeeId } : t)))
  }

  // ---------- превью-матрица в редакторе (строится «на лету» из текущих полей формы) ----------
  const editorPreviewData = useMemo(() => {
    const evaluators = items.filter((i) => i.employeeId && i.employeeId !== -1)
    const targets = targetRows.filter((t) => t.employeeId !== -1)
    if (evaluators.length === 0 || targets.length === 0) return []
    let idx = 0
    const rows: any[] = []
    evaluators.forEach((ev) => {
      targets.forEach((tg) => {
        idx += 1
        rows.push({
          id: idx,
          evaluatorId: ev.employeeId,
          evaluatorName: employeeNameById.get(ev.employeeId) || '—',
          targetId: tg.employeeId,
          targetName: employeeNameById.get(tg.employeeId) || '—',
          token: '',
          completed: true,
        })
      })
    })
    return rows
  }, [items, targetRows, employeeNameById])

  // ---------- превью-матрица для карточки уже сохранённой группы ----------
  const buildSavedPreview = (t: RespondentTemplate) => {
    const evaluators = t.items.filter((i) => i.employeeId != null)
    if (evaluators.length === 0 || t.targets.length === 0) return []
    let idx = 0
    const rows: any[] = []
    evaluators.forEach((ev) => {
      t.targets.forEach((tg) => {
        idx += 1
        rows.push({
          id: idx,
          evaluatorId: ev.employeeId!,
          evaluatorName: ev.employeeName || '—',
          targetId: tg.employeeId,
          targetName: tg.employeeName,
          token: '',
          completed: true,
        })
      })
    })
    return rows
  }

  if (isLoading) {
    return <LogoLoader />
  }

  return (
    <div>
      <div className="animate-fadeInUp mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-directum-dark">Шаблоны респондентов</h1>
          <p className="mt-1 text-gray-500">
            Группы респондентов — заранее описанный состав оцениваемых и тех, кто их
            оценивает. Группу можно оставить универсальной (оцениваемый выбирается при
            применении) или сразу привязать к одному или нескольким оцениваемым.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex shrink-0 items-center space-x-2">
          <Plus size={20} />
          <span>Создать группу</span>
        </button>
      </div>

      {templates && templates.length > 0 && (
        <div className="animate-fadeInUp mb-6 flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-700">
          <span className="text-sm text-gray-500">Отображение:</span>
          <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setPageView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                pageView === 'list'
                  ? 'bg-directum-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <List size={15} />
              Список
            </button>
            <button
              onClick={() => setPageView('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                pageView === 'matrix'
                  ? 'bg-directum-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <Grid3x3 size={15} />
              Матрица
            </button>
          </div>
        </div>
      )}

      {templates?.length === 0 ? (
        <div className="card animate-fadeInUp py-12 text-center">
          <Boxes size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Групп респондентов пока нет</p>
          <button onClick={openCreate} className="btn-secondary mt-4 inline-block">
            Создать первую группу
          </button>
        </div>
      ) : pageView === 'list' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates?.map((t, index) => (
            <div
              key={t.id}
              className="card animate-fadeInUp"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-directum-orange/10 text-directum-orange">
                    <Boxes size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-directum-dark dark:text-white">{t.name}</h3>
                    {t.description && <p className="mt-1 text-sm text-gray-500">{t.description}</p>}
                  </div>
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

              <div className="mt-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <Target size={13} />
                  Кого оценивают {t.targets.length > 0 ? `(${t.targets.length})` : ''}
                </p>
                {t.targets.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {t.targets.map((target) => (
                      <span
                        key={target.id}
                        className="rounded-full bg-directum-orange/10 px-2.5 py-1 text-xs text-directum-orange"
                      >
                        {target.employeeName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-gray-400">
                    Универсальная — оцениваемый выбирается при применении
                  </p>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <UserCheck size={13} />
                  Кто оценивает ({t.items.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {t.items.map((item) => (
                    <span
                      key={item.id}
                      className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {item.employeeName || 'Сам оцениваемый'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {templates?.map((t, index) => {
            const preview = buildSavedPreview(t)
            return (
              <div
                key={t.id}
                className="card animate-fadeInUp"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-directum-orange/10 text-directum-orange">
                      <Boxes size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-directum-dark dark:text-white">{t.name}</h3>
                      {t.description && <p className="mt-1 text-sm text-gray-500">{t.description}</p>}
                    </div>
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

                {preview.length > 0 ? (
                  <SurveyMatrix
                    data={preview}
                    employees={[]}
                    isDraft={false}
                    onAdd={noop}
                    onDelete={noop}
                    onCopyLink={noop}
                    isMutating={false}
                    deleteMutation={dummyDeleteMutation}
                    variant="preview"
                    rowLabel="Оценивает"
                    colLabel="Оценивают"
                  />
                ) : (
                  <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-sm italic text-gray-400 dark:bg-gray-800">
                    {t.targets.length === 0
                      ? 'Группа универсальная — оцениваемые не заданы, матрицу показать нельзя'
                      : 'Добавьте хотя бы одного респондента, чтобы увидеть матрицу'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ---------- редактор ---------- */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEditor} />

          <div className="animate-fadeInUp relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-directum-dark dark:text-white">
                {editingId ? 'Редактирование группы' : 'Новая группа респондентов'}
              </h3>
              <button
                onClick={closeEditor}
                className="rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-5 p-4">
              <div>
                <label className="label-field">Название группы</label>
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

              {/* Переключатель список / матрица */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-700">
                <span className="text-sm text-gray-500">Состав группы:</span>
                <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setEditorView('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                      editorView === 'list'
                        ? 'bg-directum-orange text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <List size={15} />
                    Список
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorView('matrix')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                      editorView === 'matrix'
                        ? 'bg-directum-orange text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Grid3x3 size={15} />
                    Матрица
                  </button>
                </div>
              </div>

              {editorView === 'list' ? (
                <div className="space-y-5">
                  {/* Кого оценивают */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="label-field mb-0 flex items-center gap-1.5">
                        <Target size={14} className="text-gray-400" />
                        Кого оценивают
                      </label>
                      <button
                        onClick={() => setTargetRows((prev) => [...prev, emptyTarget()])}
                        className="flex items-center gap-1 text-sm text-directum-orange hover:underline"
                      >
                        <Plus size={14} />
                        Добавить оцениваемого
                      </button>
                    </div>

                    {targetRows.length === 0 ? (
                      <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs italic text-gray-400 dark:bg-gray-700">
                        Никого не выбрано — группа останется универсальной, оцениваемый будет
                        выбираться вручную при применении.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {targetRows.map((row, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <select
                              value={row.employeeId ?? ''}
                              onChange={(e) => updateTargetRow(index, Number(e.target.value))}
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
                              onClick={() => setTargetRows((prev) => prev.filter((_, i) => i !== index))}
                              className="p-1 text-gray-400 transition-colors hover:text-red-500"
                              title="Убрать"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {missingTarget && (
                      <p className="mt-2 text-sm text-red-500">Выберите сотрудника в каждой строке или уберите пустую</p>
                    )}
                    {duplicateTargets && (
                      <p className="mt-2 text-sm text-red-500">Один сотрудник не может быть оцениваемым дважды</p>
                    )}
                  </div>

                  {/* Кто оценивает */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="label-field mb-0 flex items-center gap-1.5">
                        <UserCheck size={14} className="text-gray-400" />
                        Кто оценивает
                      </label>
                      <button
                        onClick={() => setItems((prev) => [...prev, emptyItem()])}
                        className="flex items-center gap-1 text-sm text-directum-orange hover:underline"
                      >
                        <Plus size={14} />
                        Добавить оценивающего
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
              ) : (
                <div>
                  {editorPreviewData.length > 0 ? (
                    <SurveyMatrix
                      data={editorPreviewData}
                      employees={[]}
                      isDraft={false}
                      onAdd={noop}
                      onDelete={noop}
                      onCopyLink={noop}
                      isMutating={false}
                      deleteMutation={dummyDeleteMutation}
                      variant="preview"
                      rowLabel="Оценивает"
                      colLabel="Оценивают"
                    />
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-6 text-center text-sm italic text-gray-400 dark:bg-gray-700">
                      Заполните списки «Кого оценивают» и «Кто оценивает» на вкладке «Список»,
                      чтобы увидеть матрицу.
                    </p>
                  )}
                </div>
              )}
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
        title="Удаление группы"
        message={`Удалить группу «${deleteModal.name}»? Уже созданные матрицы опросов это не затронет.`}
        confirmText="Удалить"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
