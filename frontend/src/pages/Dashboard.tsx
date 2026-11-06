import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { getSurveys, deleteSurvey, publishSurvey, completeSurvey } from '../api/surveys'
import { Link } from 'react-router-dom'
import { Plus, FileText, CheckCircle, Clock, Trash2, Rocket, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '../components/ConfirmModal'
import { useState } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { Edit } from 'lucide-react'
import LogoLoader from '../components/LogoLoader'

export default function Dashboard() {
  const queryClient = useQueryClient()

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500)

  const statusParam = filterStatus === 'all' ? undefined : filterStatus
  const searchParam = debouncedSearch || undefined

  const { data: surveys, isLoading, isFetching, error } = useQuery({
    queryKey: ['surveys', statusParam, searchParam],
    queryFn: () => getSurveys(statusParam, searchParam),
    placeholderData: keepPreviousData,
    staleTime: 5000,
  })

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id?: number
    title?: string
  }>({ isOpen: false })

  const [publishModal, setPublishModal] = useState<{
    isOpen: boolean
    id?: number
    title?: string
  }>({ isOpen: false })

  const [completeModal, setCompleteModal] = useState<{
    isOpen: boolean
    id?: number
    title?: string
  }>({ isOpen: false })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      toast.success('Опрос успешно удалён')
      setDeleteModal({ isOpen: false })
    },
    onError: (error: any) => {
      const message = error.response?.data || error.message || 'Не удалось удалить опрос'
      toast.error(message)
      setDeleteModal({ isOpen: false })
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: number) => publishSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      toast.success('Опрос успешно опубликован!')
      setPublishModal({ isOpen: false })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось опубликовать опрос'
      toast.error(message)
      setPublishModal({ isOpen: false })
    },
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => completeSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      toast.success('Опрос успешно завершён!')
      setCompleteModal({ isOpen: false })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось завершить опрос'
      toast.error(message)
      setCompleteModal({ isOpen: false })
    },
  })

  const handleDelete = (id: number, title: string) => {
    setDeleteModal({ isOpen: true, id, title })
  }

  const handlePublish = (id: number, title: string) => {
    setPublishModal({ isOpen: true, id, title })
  }

  const handleComplete = (id: number, title: string) => {
    setCompleteModal({ isOpen: true, id, title })
  }

  const resetFilters = () => {
    setFilterStatus('all')
    setSearchInput('')
  }

  const activeSurveys = surveys?.filter(s => s.status === 'Active').length || 0
  const completedSurveys = surveys?.filter(s => s.status === 'Completed').length || 0
  const draftSurveys = surveys?.filter(s => s.status === 'Draft').length || 0

  if (isLoading) {
    return (
      <LogoLoader label="Загрузка опросов..." />
    )
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50 animate-fadeIn">
        <p className="text-red-600">Ошибка при загрузке опросов. Попробуйте позже.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end animate-fadeInUp">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-directum-orange dark:border-orange-900/50 dark:bg-orange-950/30">
            <span className="h-1.5 w-1.5 rounded-full bg-directum-orange" /> Обзор
          </div>
          <h1 className="page-title">Дашборд</h1>
          <p className="page-description">Управляйте опросами, участниками и результатами в одном месте</p>
        </div>
        <Link to="/survey/new" className="btn-primary w-full sm:w-auto">
          <Plus size={20} />
          <span>Создать опрос</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card overflow-hidden animate-fadeInUp-delay">
          <div className="absolute inset-y-0 left-0 w-1 bg-directum-orange" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Активные</p>
              <p className="text-2xl font-bold text-directum-orange">{activeSurveys}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/40">
              <Clock className="text-directum-orange" size={24} />
            </div>
          </div>
        </div>
        <div className="card overflow-hidden animate-fadeInUp-delay-2">
          <div className="absolute inset-y-0 left-0 w-1 bg-green-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Завершённые</p>
              <p className="text-2xl font-bold text-green-600">{completedSurveys}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950/40">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>
        <div className="card overflow-hidden animate-fadeInUp-delay-3">
          <div className="absolute inset-y-0 left-0 w-1 bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Черновики</p>
              <p className="text-2xl font-bold text-gray-600">{draftSurveys}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
              <FileText className="text-gray-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="surface mb-6 flex flex-col items-stretch justify-between gap-3 p-3.5 sm:flex-row sm:items-center sm:p-4 animate-fadeInUp">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-field pl-10"
            />
            {isFetching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-directum-orange border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field w-full sm:w-auto sm:min-w-44"
          >
            <option value="all">Все опросы</option>
            <option value="Draft">Черновики</option>
            <option value="Active">Активные</option>
            <option value="Completed">Завершённые</option>
          </select>
        </div>

        {(searchInput || filterStatus !== 'all') && (
          <button
            onClick={resetFilters}
            className="text-sm text-gray-500 hover:text-directum-dark flex items-center space-x-1 transition-colors"
          >
            <X size={16} />
            <span>Сбросить фильтры</span>
          </button>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-directum-dark dark:text-gray-100 sm:text-xl">
        Мои опросы
        {isFetching && !isLoading && (
          <span className="text-sm text-gray-400 ml-2">
            <span className="inline-block w-3 h-3 border-2 border-directum-orange border-t-transparent rounded-full animate-spin align-middle mr-1"></span>
            обновление...
          </span>
        )}
      </h2>
      {surveys && surveys.length > 0 && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">{surveys.length} {surveys.length === 1 ? 'опрос' : 'опросов'}</span>}
      </div>

      {surveys?.length === 0 ? (
        <div className="card text-center py-12 animate-fadeInUp">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Нет опросов, соответствующих фильтрам</p>
          {(searchInput || filterStatus !== 'all') && (
            <button onClick={resetFilters} className="btn-secondary inline-block mt-4">
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 max-w-full">
          {surveys?.map((survey, index) => (
            <div
              key={`${survey.id}-${statusParam || 'all'}-${searchParam || ''}`}
              className="card animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3 overflow-hidden">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-directum-orange dark:bg-orange-950/40">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="min-w-0 break-words text-base font-semibold text-directum-dark dark:text-white sm:text-lg">{survey.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      survey.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : survey.status === 'Completed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {survey.status === 'Active' ? 'Активен' : survey.status === 'Completed' ? 'Завершён' : 'Черновик'}
                    </span>
                  </div>
                  {survey.description && (
                    <p className="text-sm text-gray-500 mt-1">{survey.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500 sm:text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} className="shrink-0 text-gray-400" />
                      {new Date(survey.startDate).toLocaleDateString('ru-RU')} {new Date(survey.startDate).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {new Date(survey.endDate).toLocaleDateString('ru-RU')} {new Date(survey.endDate).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-700 xl:border-0 xl:pt-0">
                  <Link
                    to={`/survey/${survey.id}/questions`}
                    className="rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-directum-orange dark:text-gray-300 dark:hover:bg-gray-700 sm:text-sm"
                  >
                    Вопросы
                  </Link>
                  <Link
                    to={`/survey/${survey.id}/matrix`}
                    className="rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-directum-orange dark:text-gray-300 dark:hover:bg-gray-700 sm:text-sm"
                  >
                    Матрица
                  </Link>
                  <Link
                    to={`/survey/${survey.id}/results`}
                    className="rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-directum-orange dark:text-gray-300 dark:hover:bg-gray-700 sm:text-sm"
                  >
                    Результаты
                  </Link>

                  {survey.status === 'Draft' && (
                    <button
                      onClick={() => handlePublish(survey.id, survey.title)}
                      className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30"
                      title="Опубликовать опрос"
                      aria-label={`Опубликовать опрос «${survey.title}»`}
                      disabled={publishMutation.isPending}
                    >
                      <Rocket size={18} />
                    </button>
                  )}

                  {survey.status === 'Active' && (
                    <button
                      onClick={() => handleComplete(survey.id, survey.title)}
                      className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30"
                      title="Досрочно завершить опрос"
                      aria-label={`Завершить опрос «${survey.title}»`}
                      disabled={completeMutation.isPending}
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}

                  {survey.status === 'Draft' && (
                    <Link
                      to={`/survey/${survey.id}/edit`}
                      className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30"
                      title="Редактировать опрос"
                      aria-label={`Редактировать опрос «${survey.title}»`}
                    >
                      <Edit size={18} />
                    </Link>
                  )}

                  <button
                    onClick={() => handleDelete(survey.id, survey.title)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                    title="Удалить опрос"
                    aria-label={`Удалить опрос «${survey.title}»`}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={() => deleteModal.id && deleteMutation.mutate(deleteModal.id)}
        title="Удаление опроса"
        message={`Вы уверены, что хотите удалить опрос "${deleteModal.title}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        type="danger"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={publishModal.isOpen}
        onClose={() => setPublishModal({ isOpen: false })}
        onConfirm={() => publishModal.id && publishMutation.mutate(publishModal.id)}
        title="Публикация опроса"
        message={`Вы уверены, что хотите опубликовать опрос "${publishModal.title}"? После публикации он станет доступен для респондентов.`}
        confirmText="Опубликовать"
        type="warning"
        isLoading={publishMutation.isPending}
      />

      <ConfirmModal
        isOpen={completeModal.isOpen}
        onClose={() => setCompleteModal({ isOpen: false })}
        onConfirm={() => completeModal.id && completeMutation.mutate(completeModal.id)}
        title="Завершение опроса"
        message={`Вы уверены, что хотите досрочно завершить опрос "${completeModal.title}"? После завершения респонденты не смогут оставлять ответы.`}
        confirmText="Завершить"
        type="warning"
        isLoading={completeMutation.isPending}
      />
    </div>
  )
}
