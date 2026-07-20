import { useQuery } from '@tanstack/react-query'
import { getUserSurveys } from '../api/user'
import { Link } from 'react-router-dom'
import { ClipboardList, CheckCircle, Clock, Search, X, FileText } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useDebounce } from '../hooks/useDebounce'

export default function UserDashboard() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['userSurveys'],
    queryFn: getUserSurveys,
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const filteredSurveys = useMemo(() => {
    if (!surveys) return []
    let filtered = surveys
    if (filterStatus === 'pending') {
      filtered = filtered.filter(s => !s.completed)
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(s => s.completed)
    }
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      filtered = filtered.filter(s =>
        s.surveyTitle.toLowerCase().includes(query) ||
        s.targetName.toLowerCase().includes(query)
      )
    }
    return filtered
  }, [surveys, filterStatus, debouncedSearch])

  const resetFilters = () => {
    setSearchQuery('')
    setFilterStatus('all')
  }

  const stats = useMemo(() => {
    if (!surveys) return { total: 0, pending: 0, completed: 0 }
    return {
      total: surveys.length,
      pending: surveys.filter(s => !s.completed).length,
      completed: surveys.filter(s => s.completed).length,
    }
  }, [surveys])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center animate-pulseSoft">
          <div className="w-12 h-12 border-4 border-directum-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-500">Загрузка опросов...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50 animate-fadeIn">
        <p className="text-red-600">Не удалось загрузить опросы. Попробуйте позже.</p>
      </div>
    )
  }

  if (!surveys || surveys.length === 0) {
    return (
      <div className="card text-center py-12 animate-fadeInUp">
        <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">У вас пока нет назначенных опросов</p>
        <p className="text-sm text-gray-400">Когда вам назначат опрос, он появится здесь</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8 animate-fadeInUp">
        <div>
          <h1 className="text-3xl font-bold text-directum-dark">Мои опросы</h1>
          <p className="text-gray-500 mt-1">Опросы, назначенные вам для прохождения</p>
        </div>
      </div>

      {/* Статистика в стиле админского дашборда */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card animate-fadeInUp-delay">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Всего опросов</p>
              <p className="text-2xl font-bold text-directum-dark">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
        <div className="card animate-fadeInUp-delay-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ожидают прохождения</p>
              <p className="text-2xl font-bold text-directum-orange">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="text-directum-orange" size={24} />
            </div>
          </div>
        </div>
        <div className="card animate-fadeInUp-delay-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Завершённые</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 animate-fadeInUp">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="input-field w-full sm:w-auto"
          >
            <option value="all">Все опросы</option>
            <option value="pending">Ожидают</option>
            <option value="completed">Завершённые</option>
          </select>
        </div>

        {(searchQuery || filterStatus !== 'all') && (
          <button
            onClick={resetFilters}
            className="text-sm text-gray-500 hover:text-directum-dark flex items-center space-x-1 transition-colors"
          >
            <X size={16} />
            <span>Сбросить фильтры</span>
          </button>
        )}
      </div>

      {filteredSurveys.length === 0 ? (
        <div className="card text-center py-12 animate-fadeInUp">
          <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Нет опросов, соответствующих фильтрам</p>
          {(searchQuery || filterStatus !== 'all') && (
            <button onClick={resetFilters} className="btn-secondary inline-block mt-4">
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 max-w-full">
          {filteredSurveys.map((survey, index) => (
            <div
              key={survey.token}
              className="card hover:shadow-md transition-shadow animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-directum-dark break-words min-w-0">
                      {survey.surveyTitle}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                      survey.completed
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {survey.completed ? 'Завершён' : 'Ожидает'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Оцениваемый: {survey.targetName}</p>
                </div>
                <div className="flex items-center space-x-2 mt-3 md:mt-0">
                  {!survey.completed && (
                    <Link
                      to={`/survey/${survey.token}`}
                      className="btn-primary text-sm px-4 py-2 transition-all duration-200 hover:scale-105"
                    >
                      Пройти опрос
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}