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
      <div className="flex justify-between items-center mb-8 animate-fadeInUp">
        <div>
          <h1 className="text-3xl font-bold text-directum-dark">Дашборд</h1>
          <p className="text-gray-500 mt-1">Управляйте своими опросами 360 градусов</p>
        </div>
        <Link to="/survey/new" className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Создать опрос</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card animate-fadeInUp-delay">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Активные</p>
              <p className="text-2xl font-bold text-directum-orange">{activeSurveys}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="text-directum-orange" size={24} />
            </div>
          </div>
        </div>
        <div className="card animate-fadeInUp-delay-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Завершённые</p>
              <p className="text-2xl font-bold text-green-600">{completedSurveys}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>
        <div className="card animate-fadeInUp-delay-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Черновики</p>
              <p className="text-2xl font-bold text-gray-600">{draftSurveys}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="text-gray-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 animate-fadeInUp">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:min-w-[200px]">
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
            className="input-field w-full sm:w-auto"
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

      <h2 className="text-xl font-semibold mb-4">
        Мои опросы
        {surveys && surveys.length > 0 && (
          <span className="text-sm font-normal text-gray-500 ml-2">
            (всего {surveys.length})
          </span>
        )}
        {isFetching && !isLoading && (
          <span className="text-sm text-gray-400 ml-2">
            <span className="inline-block w-3 h-3 border-2 border-directum-orange border-t-transparent rounded-full animate-spin align-middle mr-1"></span>
            обновление...
          </span>
        )}
      </h2>

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
              className="card hover:shadow-md transition-shadow animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-directum-dark break-words min-w-0">{survey.title}</h3>
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
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    <span className="whitespace-nowrap">
                      📅 {new Date(survey.startDate).toLocaleDateString('ru-RU')} {new Date(survey.startDate).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {new Date(survey.endDate).toLocaleDateString('ru-RU')} {new Date(survey.endDate).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-3 md:mt-0">
                  <Link
                    to={`/survey/${survey.id}/questions`}
                    className="text-sm text-directum-orange hover:underline transition-all duration-200 hover:scale-105"
                  >
                    Вопросы
                  </Link>
                  <Link
                    to={`/survey/${survey.id}/matrix`}
                    className="text-sm text-directum-orange hover:underline transition-all duration-200 hover:scale-105"
                  >
                    Матрица
                  </Link>
                  <Link
                    to={`/survey/${survey.id}/results`}
                    className="text-sm text-directum-orange hover:underline transition-all duration-200 hover:scale-105"
                  >
                    Результаты
                  </Link>

                  {survey.status === 'Draft' && (
                    <button
                      onClick={() => handlePublish(survey.id, survey.title)}
                      className="text-green-600 hover:text-green-700 transition-colors p-1 hover:scale-110 transform"
                      title="Опубликовать опрос"
                      disabled={publishMutation.isPending}
                    >
                      <Rocket size={18} />
                    </button>
                  )}

                  {survey.status === 'Active' && (
                    <button
                      onClick={() => handleComplete(survey.id, survey.title)}
                      className="text-blue-600 hover:text-blue-700 transition-colors p-1 hover:scale-110 transform"
                      title="Досрочно завершить опрос"
                      disabled={completeMutation.isPending}
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}

                  {survey.status === 'Draft' && (
                    <Link
                      to={`/survey/${survey.id}/edit`}
                      className="text-blue-500 hover:text-blue-700 transition-colors p-1 hover:scale-110 transform"
                      title="Редактировать опрос"
                    >
                      <Edit size={18} />
                    </Link>
                  )}

                  <button
                    onClick={() => handleDelete(survey.id, survey.title)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:scale-110 transform"
                    title="Удалить опрос"
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