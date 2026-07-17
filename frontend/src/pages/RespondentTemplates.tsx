import { useMemo, useState, useCallback } from 'react'
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

type ViewMode = 'list' | 'matrix'

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

  // ---------- отображение страницы ----------
  const [pageView, setPageView] = useState<ViewMode>('list')

  // ---------- состояние редактора ----------
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorView, setEditorView] = useState<ViewMode>('list')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // ---------- НОВАЯ МОДЕЛЬ: отдельные списки и список связей ----------
  const [evaluatorIds, setEvaluatorIds] = useState<number[]>([]) // все добавленные оценивающие
  const [targetIds, setTargetIds] = useState<number[]>([])      // все добавленные оцениваемые
  const [links, setLinks] = useState<{ evaluatorId: number; targetId: number }[]>([]) // явные связи

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id?: number; name?: string }>({
    isOpen: false,
  })

  // ---------- функции работы ----------
  const handleMatrixAdd = useCallback((evaluatorId: number, targetId: number) => {
    // Добавляем в списки, если их ещё нет
    if (!evaluatorIds.includes(evaluatorId)) {
      setEvaluatorIds(prev => [...prev, evaluatorId])
    }
    if (!targetIds.includes(targetId)) {
      setTargetIds(prev => [...prev, targetId])
    }
    // Добавляем связь
    if (!links.some(l => l.evaluatorId === evaluatorId && l.targetId === targetId)) {
      setLinks(prev => [...prev, { evaluatorId, targetId }])
    }
  }, [evaluatorIds, targetIds, links])

  const handleMatrixDelete = useCallback((evaluatorId: number, targetId: number) => {
    setLinks(prev => prev.filter(l => !(l.evaluatorId === evaluatorId && l.targetId === targetId)))
  }, [])

  const addEvaluator = useCallback((employeeId: number) => {
    if (evaluatorIds.includes(employeeId)) {
      toast.error('Этот сотрудник уже добавлен как оценивающий')
      return
    }
    setEvaluatorIds(prev => [...prev, employeeId])
    // Если есть оцениваемые, создаём связи со всеми
    if (targetIds.length > 0) {
      const newLinks = targetIds.map(targetId => ({ evaluatorId: employeeId, targetId }))
      setLinks(prev => [...prev, ...newLinks])
    }
  }, [evaluatorIds, targetIds])

  const removeEvaluator = useCallback((employeeId: number) => {
    setEvaluatorIds(prev => prev.filter(id => id !== employeeId))
    setLinks(prev => prev.filter(l => l.evaluatorId !== employeeId))
  }, [])

  const addTarget = useCallback((employeeId: number) => {
    if (targetIds.includes(employeeId)) {
      toast.error('Этот сотрудник уже добавлен как оцениваемый')
      return
    }
    setTargetIds(prev => [...prev, employeeId])
    // Если есть оценивающие, создаём связи со всеми
    if (evaluatorIds.length > 0) {
      const newLinks = evaluatorIds.map(evaluatorId => ({ evaluatorId, targetId: employeeId }))
      setLinks(prev => [...prev, ...newLinks])
    }
  }, [targetIds, evaluatorIds])

  const removeTarget = useCallback((employeeId: number) => {
    setTargetIds(prev => prev.filter(id => id !== employeeId))
    setLinks(prev => prev.filter(l => l.targetId !== employeeId))
  }, [])

  // ---------- сброс и открытие ----------
  const resetEditor = useCallback(() => {
    setEditingId(null)
    setName('')
    setDescription('')
    setEvaluatorIds([])
    setTargetIds([])
    setLinks([])
    setEditorView('list')
  }, [])

  const openCreate = useCallback(() => {
    resetEditor()
    setEditorOpen(true)
  }, [resetEditor])

  const openEdit = useCallback((t: RespondentTemplate) => {
    setEditingId(t.id)
    setName(t.name)
    setDescription(t.description ?? '')
    const evIds = t.items.map(i => i.employeeId!).filter(id => id != null)
    const tgIds = t.targets.map(tg => tg.employeeId)
    setEvaluatorIds(evIds)
    setTargetIds(tgIds)
    // Строим декартово произведение
    const newLinks: { evaluatorId: number; targetId: number }[] = []
    evIds.forEach(evalId => {
      tgIds.forEach(tgtId => {
        newLinks.push({ evaluatorId: evalId, targetId: tgtId })
      })
    })
    setLinks(newLinks)
    setEditorView('list')
    setEditorOpen(true)
  }, [])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    resetEditor()
  }, [resetEditor])

  // ---------- мутации ----------
  const saveMutation = useMutation({
    mutationFn: () => {
      const dto = {
        name: name.trim(),
        description: description.trim() || undefined,
        items: evaluatorIds.map(id => ({ employeeId: id })),
        targetEmployeeIds: targetIds,
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

  // ---------- валидация ----------
  const canSave = name.trim().length > 0 && evaluatorIds.length > 0 && targetIds.length > 0

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

  const handleMatrixAdd = (evaluatorId: number, targetId: number) => {
    // Добавляем оценивающего, если его ещё нет
    if (!items.some((i) => i.employeeId === evaluatorId)) {
      setItems((prev) => [...prev, { employeeId: evaluatorId }])
    }
    // Добавляем оцениваемого, если его ещё нет
    if (!targetRows.some((t) => t.employeeId === targetId)) {
      setTargetRows((prev) => [...prev, { employeeId: targetId }])
    }
  }

  const handleMatrixDelete = (id: number, evaluator: string, targetName: string) => {
  // Находим элемент по id
  const itemToDelete = editorPreviewData.find(item => item.id === id);
  
  if (!itemToDelete) return;
  
  const { evaluatorId, targetId } = itemToDelete;
  
  // В режиме редактирования матрицы удаляем строку или столбец целиком
  // Удаляем оценивающего, если его нет в других местах
  const hasOtherTargets = targetRows.filter((t) => t.employeeId !== targetId).length > 0;
  if (!hasOtherTargets) {
    setItems((prev) => prev.filter((i) => i.employeeId !== evaluatorId));
  }
  
  // Удаляем оцениваемого, если его нет в других оценивающих
  const hasOtherEvaluators = items.filter((i) => i.employeeId !== evaluatorId).length > 0;
  if (!hasOtherEvaluators) {
    setTargetRows((prev) => prev.filter((t) => t.employeeId !== targetId));
  }
  
  // Также удаляем саму связь из editorPreviewData
  // (здесь должна быть логика обновления editorPreviewData)
};

  // ---------- превью-матрица в редакторе (строится «на лету» из текущих полей формы) ----------
  const editorPreviewData = useMemo(() => {
    if (links.length === 0) return []
    const uniqueEvaluators = [...new Set(links.map(l => l.evaluatorId))]
    const uniqueTargets = [...new Set(links.map(l => l.targetId))]
    let idx = 0
    const rows: any[] = []
    uniqueEvaluators.forEach(evalId => {
      uniqueTargets.forEach(tgtId => {
        const exists = links.some(l => l.evaluatorId === evalId && l.targetId === tgtId)
        if (exists) {
          idx += 1
          rows.push({
            id: idx,
            evaluatorId: evalId,
            evaluatorName: employeeNameById.get(evalId) || '—',
            targetId: tgtId,
            targetName: employeeNameById.get(tgtId) || '—',
            token: '',
            completed: true,
          })
        }
      })
    })
    return rows
  }, [links, employeeNameById])

  // ---------- deleteMock и onDeleteWrapper ----------
  const deleteMock = useMemo(() => ({
    mutateAsync: async (id: number) => {
      const item = editorPreviewData.find(d => d.id === id)
      if (!item) return
      handleMatrixDelete(item.evaluatorId, item.targetId)
    }
  }), [editorPreviewData, handleMatrixDelete])

  const onDeleteWrapper = useCallback((id: number, evaluatorName: string, targetName: string) => {
    const item = editorPreviewData.find(d => d.id === id)
    if (item) {
      handleMatrixDelete(item.evaluatorId, item.targetId)
    }
  }, [editorPreviewData, handleMatrixDelete])

  // ---------- загрузка ----------
  if (isLoading) {
    return <LogoLoader />
  }

  // ---------- превью для карточек ----------
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

  // ---------- JSX ----------
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
                    isDraft={true}
                    onAdd={() => {}}
                    onDelete={() => {}}
                    onCopyLink={() => {}}
                    isMutating={false}
                    deleteMutation={{ mutateAsync: async () => {} }}
                    variant="template"
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

              {editorView === 'list' ? (
                <div className="space-y-5">
                  {/* Кого оценивают */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="label-field mb-0 flex items-center gap-1.5">
                        <Target size={14} className="text-gray-400" />
                        Кого оценивают
                      </label>
                      <div className="flex gap-1">
                        <select
                          value=""
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            if (val) addTarget(val)
                            e.target.value = ''
                          }}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                        >
                          <option value="">+ Добавить</option>
                          {employees
                            ?.filter(e => !targetIds.includes(e.id))
                            .map(e => (
                              <option key={e.id} value={e.id}>{e.fullName}</option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {targetIds.length === 0 ? (
                      <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs italic text-gray-400 dark:bg-gray-700">
                        Никого не выбрано — группа останется универсальной, оцениваемый будет выбираться вручную.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {targetIds.map((id) => {
                          const name = employeeNameById.get(id) || '—'
                          return (
                            <div key={id} className="flex items-center gap-2">
                              <span className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700">
                                {name}
                              </span>
                              <button
                                onClick={() => removeTarget(id)}
                                className="p-1 text-gray-400 transition-colors hover:text-red-500"
                                title="Убрать"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Кто оценивает */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="label-field mb-0 flex items-center gap-1.5">
                        <UserCheck size={14} className="text-gray-400" />
                        Кто оценивает
                      </label>
                      <div className="flex gap-1">
                        <select
                          value=""
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            if (val) addEvaluator(val)
                            e.target.value = ''
                          }}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                        >
                          <option value="">+ Добавить</option>
                          {employees
                            ?.filter(e => !evaluatorIds.includes(e.id))
                            .map(e => (
                              <option key={e.id} value={e.id}>{e.fullName}</option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {evaluatorIds.map((id) => {
                        const name = employeeNameById.get(id) || '—'
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <span className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700">
                              {name}
                            </span>
                            <button
                              onClick={() => removeEvaluator(id)}
                              className="p-1 text-gray-400 transition-colors hover:text-red-500"
                              title="Убрать"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {editorPreviewData.length > 0 ? (
                    <SurveyMatrix
                      data={editorPreviewData}
                      employees={employees?.map(e => ({ value: e.id, label: e.fullName })) || []}
                      isDraft={true}
                      onAdd={handleMatrixAdd}
                      onDelete={onDeleteWrapper}
                      onCopyLink={() => {}}
                      isMutating={false}
                      deleteMutation={deleteMock}
                      variant="template"
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