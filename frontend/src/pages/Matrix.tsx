import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatrix, addMatrixItem, deleteMatrixItem } from '../api/matrix'
import { getEmployees } from '../api/employees'
import { getSurvey } from '../api/surveys'
import { getRespondentTemplates, applyRespondentTemplate } from '../api/respondentTemplates'
import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Plus, Trash2, Link, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '../components/ConfirmModal'
import Select from 'react-select'
import { reactSelectStyles } from '../styles/reactSelectStyles'
import { SurveyMatrix } from '../components/MatrixGrid'
import LogoLoader from '../components/LogoLoader'


export default function Matrix() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const surveyId = parseInt(id!)
  const queryClient = useQueryClient()

  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => getSurvey(surveyId),
  })

  const { data: matrix, isLoading: mLoading } = useQuery({
    queryKey: ['matrix', surveyId],
    queryFn: () => getMatrix(surveyId),
  })
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  })
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['respondentTemplates'],
    queryFn: getRespondentTemplates,
  })

  // Состояния
  const [evaluatorId, setEvaluatorId] = useState<number | ''>('')
  const [targetId, setTargetId] = useState<number | ''>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id?: number
    evaluatorName?: string
    targetName?: string
  }>({ isOpen: false })
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false)
  type FillMode = 'list' | 'matrix'
  const [fillMode, setFillMode] = useState<FillMode>('matrix')
  type SortField = 'targetName' | 'evaluatorName'
  type SortOrder = 'asc' | 'desc'
  const [sortBy, setSortBy] = useState<SortField>('targetName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

 const sortedMatrix = useMemo(() => {
    if (!matrix) return []
    return [...matrix].sort((a, b) => {
      const field = sortBy
      const comparison = (a[field] || '').localeCompare(b[field] || '', 'ru', { sensitivity: 'base' })
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [matrix, sortBy, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  } 

  const isDraft = survey?.status === 'Draft'

  // При загрузке опроса, если у него уже есть целевой сотрудник, устанавливаем его в поле "Кого оценивают"
  useEffect(() => {
    if (survey?.targetId) {
      setTargetId(survey.targetId)
    }
  }, [survey])

  // Опции для react-select
  const evaluatorOptions = (employees || []).map(e => ({
    value: e.id,
    label: e.fullName,
  }))
  const targetOptions = (employees || []).map(e => ({
    value: e.id,
    label: e.fullName,
  }))
  const templateOptions = (templates || []).map(t => ({
    value: t.id,
    label: t.name,
  }))

  const selectedEvaluator = evaluatorId
    ? evaluatorOptions.find(opt => opt.value === evaluatorId)
    : null

  const selectedTarget = targetId
    ? targetOptions.find(opt => opt.value === targetId)
    : null

  const selectedTemplate = selectedTemplateId
    ? templateOptions.find(opt => opt.value === selectedTemplateId)
    : null

  const selectedTemplateObj = selectedTemplateId
    ? templates?.find(t => t.id === selectedTemplateId)
    : null

  // шаблон с зашитыми оцениваемыми применяется сразу ко всем им, без ручного выбора
  const templateHasOwnTargets = (selectedTemplateObj?.targets.length ?? 0) > 0

  // Находим имя целевого сотрудника для отображения
  const targetEmployee = employees?.find(e => e.id === targetId)

  const addMutation = useMutation({
    mutationFn: (data: any) => addMatrixItem(surveyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      setEvaluatorId('')
      toast.success('Связь добавлена в матрицу')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось добавить связь'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) => deleteMatrixItem(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      setDeleteModal({ isOpen: false })
      toast.success('Связь удалена')
    },
    onError: (error: any) => {
      toast.error('Не удалось удалить связь')
      setDeleteModal({ isOpen: false })
    },
  })

  const applyTemplateMutation = useMutation({
    mutationFn: (data: { templateId: number; targetIds?: number[] }) =>
      applyRespondentTemplate(surveyId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      setIsApplyingTemplate(false)
      setSelectedTemplateId(null)
      const message = 
        result.created === 0 && result.skipped > 0
          ? `Все связи уже существуют (пропущено ${result.skipped})`
          : result.skipped > 0
          ? `Шаблон применён: добавлено ${result.created}, пропущено (уже было) ${result.skipped}`
          : `Шаблон матрицы успешно применён! Добавлено ${result.created} связей`
      toast.success(message)
    },
    onError: (error: any) => {
      console.error('Ошибка применения шаблона:', error)
      const message = error.response?.data?.message || error.message || 'Не удалось применить шаблон'
      toast.error(message)
      setIsApplyingTemplate(false)
    },
  })

  const handleAdd = () => {
    if (!evaluatorId) {
      toast.error('Выберите оценивающего сотрудника')
      return
    }
    if (!targetId) {
      toast.error('Выберите сотрудника, которого оценивают')
      return
    }
    addMutation.mutate({
      evaluatorId: Number(evaluatorId),
      targetId: Number(targetId),
    })
  }

  const handleApplyTemplate = () => {
    if (!selectedTemplateId) {
      toast.error('Выберите шаблон матрицы')
      return
    }
    if (!templateHasOwnTargets && !targetId) {
      toast.error('Сначала выберите сотрудника, которого оценивают')
      return
    }
    setIsApplyingTemplate(true)
    // Если шаблон имеет собственных оцениваемых, не передаём targetIds
    // Если шаблон универсальный, передаём выбранного оцениваемого
    applyTemplateMutation.mutate({
      templateId: selectedTemplateId,
      targetIds: templateHasOwnTargets ? [] : [Number(targetId)],
    })
  }

  const handleEvaluatorChange = (option: any) => {
    setEvaluatorId(option?.value || '')
  }

  const handleTargetChange = (option: any) => {
    setTargetId(option?.value || '')
  }

  const handleTemplateChange = (option: any) => {
    setSelectedTemplateId(option?.value || null)
  }

  const handleDeleteClick = (id: number, evaluatorName: string, targetName: string) => {
    setDeleteModal({ isOpen: true, id, evaluatorName, targetName })
  }

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/survey/${token}`
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Ссылка скопирована в буфер обмена!', { icon: '📋' }))
      .catch(() => toast.error('Не удалось скопировать ссылку'))
  }

  if (surveyLoading || mLoading || templatesLoading) {
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

      <div className="card animate-fadeInUp">
        <h1 className="text-2xl font-bold text-directum-dark mb-2">Матрица опроса</h1>
        <p className="text-gray-500 mb-6">
          Назначьте, кто кого оценивает в рамках опроса 360 градусов
        </p>

        <div className="flex flex-wrap gap-4 items-end p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Шаблон матрицы
            </label>
            <Select
              options={templateOptions}
              value={selectedTemplate}
              onChange={handleTemplateChange}
              placeholder="Выберите шаблон"
              isClearable
              isSearchable
              styles={reactSelectStyles}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              isDisabled={!isDraft}
            />
            {selectedTemplateObj && templateHasOwnTargets && (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                💡 Шаблон содержит {selectedTemplateObj.targets.length} оцениваемых. 
                Применится ко всем им.
              </p>
            )}
          </div>
          <button
            onClick={handleApplyTemplate}
            disabled={applyTemplateMutation.isPending || !selectedTemplateId || (!templateHasOwnTargets && !targetId)}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={applyTemplateMutation.isPending ? 'animate-spin' : ''} />
            <span>{applyTemplateMutation.isPending ? 'Применение...' : 'Применить'}</span>
          </button>
        </div>

        {isDraft ? (
          <div className="space-y-4">
            {/* Переключатель */}
            <div className="flex flex-wrap items-center gap-4 py-2 border-b border-gray-200 pb-3">
              <span className="text-sm text-gray-500">Отображение:</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${fillMode === 'list' ? 'text-gray-800' : 'text-gray-400'}`}>
                  Список
                </span>
                <button
                  onClick={() => setFillMode(fillMode === 'matrix' ? 'list' : 'matrix')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    fillMode === 'matrix' ? 'bg-directum-orange' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={fillMode === 'matrix'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      fillMode === 'matrix' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${fillMode === 'matrix' ? 'text-gray-800' : 'text-gray-400'}`}>
                  Матрица
                </span>
              </div>
            </div>

            {/* Режим списка */}
            {fillMode === 'list' && (
              <>
                {/* Форма добавления */}
                <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-fadeInUp-delay">
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Кого оценивают
                    </label>
                    <Select
                      options={targetOptions}
                      value={selectedTarget}
                      onChange={handleTargetChange}
                      placeholder="Выберите сотрудника"
                      isClearable
                      isSearchable
                      styles={reactSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      isDisabled={!isDraft}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Кто оценивает
                    </label>
                    <Select
                      options={evaluatorOptions}
                      value={selectedEvaluator}
                      onChange={handleEvaluatorChange}
                      placeholder="Выберите сотрудника"
                      isClearable
                      isSearchable
                      styles={reactSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      isDisabled={!isDraft || !targetId}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleAdd}
                      className="btn-primary flex items-center space-x-2"
                      disabled={addMutation.isPending || !evaluatorId || !targetId}
                    >
                      <Plus size={18} />
                      <span>Добавить</span>
                    </button>
                  </div>
                </div>

                {/* Таблица (список) */}
                {matrix?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Матрица пуста</p>
                    <p className="text-sm">Добавьте связи с помощью формы выше или примените шаблон</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto animate-fadeInUp">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th 
  className="text-left py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none transition-colors"
  onClick={() => handleSort('targetName')}
>
  <div className="flex items-center gap-1">
    <span>Оцениваемый</span>
    {sortBy === 'targetName' && (
      sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
    )}
  </div>
</th>
<th 
  className="text-left py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none transition-colors"
  onClick={() => handleSort('evaluatorName')}
>
  <div className="flex items-center gap-1">
    <span>Оценивает</span>
    {sortBy === 'evaluatorName' && (
      sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
    )}
  </div>
</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ссылка</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Статус</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Действие</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMatrix.map((item, index) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors animate-fadeInUp"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <td className="py-3 px-4 text-sm">{item.targetName}</td>
                            <td className="py-3 px-4 text-sm">{item.evaluatorName}</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleCopyLink(item.token)}
                                className="text-directum-orange hover:underline text-sm flex items-center space-x-1 transition-all duration-200 hover:scale-105 group"
                              >
                                <Link size={14} className="group-hover:animate-pulse" />
                                <span>Копировать ссылку</span>
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                item.completed
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {item.completed ? 'Завершено' : 'Ожидает'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteClick(item.id, item.evaluatorName, item.targetName)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:scale-110 transform"
                                title="Удалить связь"
                                disabled={deleteMutation.isPending || !isDraft || item.completed}
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Режим матрицы */}
            {fillMode === 'matrix' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Матрица оценок
                </h3>
               <SurveyMatrix
                 data={matrix || []}
                 employees={evaluatorOptions || []}
                 isDraft={isDraft}
                 onAdd={(evalId, tgtId) => addMutation.mutate({ evaluatorId: evalId, targetId: tgtId })}
                 onDelete={(id, evName, tgtName) => handleDeleteClick(id, evName, tgtName)}
                 onCopyLink={handleCopyLink}
                 isMutating={addMutation.isPending || deleteMutation.isPending}
                 deleteMutation={deleteMutation}
               />
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-700">
              ⚠️ Добавление участников доступно только для опросов в статусе «Черновик».
              <br />
              Текущий статус: <strong>{survey?.status === 'Active' ? 'Активен' : 'Завершён'}</strong>
            </div>
            <div className="space-y-4">
                {/* Переключатель */}
                <div className="flex flex-wrap items-center gap-4 py-2 border-b border-gray-200 pb-3">
                  <span className="text-sm text-gray-500">Отображение:</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${fillMode === 'list' ? 'text-gray-800' : 'text-gray-400'}`}>
                      Список
                    </span>
                    <button
                      onClick={() => setFillMode(fillMode === 'matrix' ? 'list' : 'matrix')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        fillMode === 'matrix' ? 'bg-directum-orange' : 'bg-gray-300'
                      }`}
                      role="switch"
                      aria-checked={fillMode === 'matrix'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          fillMode === 'matrix' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-medium ${fillMode === 'matrix' ? 'text-gray-800' : 'text-gray-400'}`}>
                      Матрица
                    </span>
                  </div>
                </div>

                {/* Режим списка */}
                {fillMode === 'list' && (
                  <>
                    {/* Таблица (список) */}
                    {matrix?.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Матрица пуста</p>
                        <p className="text-sm">Добавьте связи с помощью формы выше</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto animate-fadeInUp">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Оцениваемый</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Оценивает</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ссылка</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Статус</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Действие</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedMatrix.map((item, index) => (
                              <tr
                                key={item.id}
                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors animate-fadeInUp"
                                style={{ animationDelay: `${index * 100}ms` }}
                              >
                                <td className="py-3 px-4 text-sm">{item.targetName}</td>
                                <td className="py-3 px-4 text-sm">{item.evaluatorName}</td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => handleCopyLink(item.token)}
                                    className="text-directum-orange hover:underline text-sm flex items-center space-x-1 transition-all duration-200 hover:scale-105 group"
                                  >
                                    <Link size={14} className="group-hover:animate-pulse" />
                                    <span>Копировать ссылку</span>
                                  </button>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    item.completed
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {item.completed ? 'Завершено' : 'Ожидает'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => handleDeleteClick(item.id, item.evaluatorName, item.targetName)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:scale-110 transform"
                                    title="Удалить связь"
                                    disabled={deleteMutation.isPending || !isDraft || item.completed}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* Режим матрицы */}
                {fillMode === 'matrix' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Матрица оценок
                    </h3>
                  <SurveyMatrix
                    data={matrix || []}
                    employees={evaluatorOptions || []}
                    isDraft={isDraft}
                    onAdd={(evalId, tgtId) => addMutation.mutate({ evaluatorId: evalId, targetId: tgtId })}
                    onDelete={(id, evName, tgtName) => handleDeleteClick(id, evName, tgtName)}
                    onCopyLink={handleCopyLink}
                    isMutating={addMutation.isPending || deleteMutation.isPending}
                    deleteMutation={deleteMutation}
                  />
                  </div>
                )}
              </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={() => deleteModal.id && deleteMutation.mutate(deleteModal.id)}
        title="Удаление связи"
        message={`Вы уверены, что хотите удалить связь "${deleteModal.evaluatorName} → ${deleteModal.targetName}"?`}
        confirmText="Удалить"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
