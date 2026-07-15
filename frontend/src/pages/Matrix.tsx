import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatrix, addMatrixItem, deleteMatrixItem } from '../api/matrix'
import { getEmployees } from '../api/employees'
import { getSurvey } from '../api/surveys'
import { getRespondentTemplates, applyRespondentTemplate } from '../api/respondentTemplates'
import { useState, useEffect } from 'react'
import { AssessmentRole } from '../types'
import { ArrowLeft, Plus, Trash2, Link, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '../components/ConfirmModal'
import Select from 'react-select'
import { reactSelectStyles } from '../styles/reactSelectStyles'

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
  const [role, setRole] = useState<AssessmentRole>(AssessmentRole.Colleague)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id?: number
    evaluatorName?: string
    targetName?: string
  }>({ isOpen: false })
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false)

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

  // Находим имя целевого сотрудника для отображения
  const targetEmployee = employees?.find(e => e.id === targetId)

  const addMutation = useMutation({
    mutationFn: (data: any) => addMatrixItem(surveyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      setEvaluatorId('')
      setRole(AssessmentRole.Colleague)
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
    mutationFn: (data: { templateId: number; targetId: number }) =>
      applyRespondentTemplate(surveyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      setIsApplyingTemplate(false)
      setSelectedTemplateId(null)
      toast.success('Шаблон матрицы успешно применён!')
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
    if (role === AssessmentRole.SelfAssessment && evaluatorId !== targetId) {
      toast.error('Для самооценки оценивающий должен быть тем же сотрудником, для которого проводится опрос')
      return
    }
    addMutation.mutate({
      evaluatorId: Number(evaluatorId),
      targetId: Number(targetId),
      role,
    })
  }

  const handleApplyTemplate = () => {
    if (!selectedTemplateId) {
      toast.error('Выберите шаблон матрицы')
      return
    }
    if (!targetId) {
      toast.error('Сначала выберите сотрудника, которого оценивают')
      return
    }
    setIsApplyingTemplate(true)
    applyTemplateMutation.mutate({ templateId: selectedTemplateId, targetId: Number(targetId) })
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

  const roleLabels = {
    [AssessmentRole.SelfAssessment]: 'Самооценка',
    [AssessmentRole.Manager]: 'Руководитель',
    [AssessmentRole.Colleague]: 'Коллега',
  }

  if (surveyLoading || mLoading || templatesLoading) {
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

      <div className="card animate-fadeInUp">
        <h1 className="text-2xl font-bold text-directum-dark mb-2">Матрица опроса</h1>
        <p className="text-gray-500 mb-6">
          Назначьте, кто кого оценивает в рамках опроса 360 градусов
        </p>

        {isDraft ? (
          <div className="space-y-4">
            {/* Блок применения шаблона */}
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
              </div>
              <button
                onClick={handleApplyTemplate}
                className="btn-primary flex items-center space-x-2"
                disabled={isApplyingTemplate || !selectedTemplateId || !targetId}
              >
                <RefreshCw size={18} className={isApplyingTemplate ? 'animate-spin' : ''} />
                <span>{isApplyingTemplate ? 'Применение...' : 'Применить шаблон'}</span>
              </button>
              <span className="text-xs text-gray-500">
                {!targetId ? 'Сначала выберите сотрудника, которого оценивают' : ''}
              </span>
            </div>

            {/* Ручное добавление */}
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

              <div className="min-w-[150px]">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Роль
                </label>
                <select
                value={role}
                onChange={(e) => setRole(e.target.value as AssessmentRole)}
                className="input-field"
                disabled={!isDraft || !targetEmployee || !evaluatorId}
              >
                {evaluatorId && targetId && Number(evaluatorId) === targetId ? (
                  <option value={AssessmentRole.SelfAssessment}>Самооценка</option>
                ) : (
                  <>
                    <option value={AssessmentRole.Manager}>Руководитель</option>
                    <option value={AssessmentRole.Colleague}>Коллега</option>
                  </>
                )}
              </select>
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
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-700">
            ⚠️ Добавление участников доступно только для опросов в статусе «Черновик».
            <br />
            Текущий статус: <strong>{survey?.status === 'Active' ? 'Активен' : 'Завершён'}</strong>
          </div>
        )}

        {matrix?.length === 0 ? (
          <div className="text-center py-8 text-gray-500 animate-fadeInUp">
            <p>Матрица пуста</p>
            <p className="text-sm">
              {isDraft && targetId
                ? 'Добавьте связи между сотрудниками с помощью формы выше или примените шаблон'
                : 'Связи не добавлены'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto animate-fadeInUp">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Оценивает</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Оцениваемый</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Роль</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ссылка</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Статус</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Действие</th>
                </tr>
              </thead>
              <tbody>
                {matrix?.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors animate-fadeInUp"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <td className="py-3 px-4 text-sm">{item.evaluatorName}</td>
                    <td className="py-3 px-4 text-sm">{item.targetName}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-directum-yellow text-directum-dark">
                        {roleLabels[item.role]}
                      </span>
                    </td>
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