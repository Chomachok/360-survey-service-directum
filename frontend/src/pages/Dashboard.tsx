import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSurveys, deleteSurvey } from '../api/surveys'
import { Link } from 'react-router-dom'
import { Plus, FileText, CheckCircle, Clock, Trash2 } from 'lucide-react'

export default function Dashboard() {
  const queryClient = useQueryClient()
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
    onError: (error: any) => {
      alert('Не удалось удалить опрос: ' + (error.response?.data || error.message))
    },
  })

  const handleDelete = (id: number, title: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить опрос "${title}"? Это действие нельзя отменить.`)) {
      deleteMutation.mutate(id)
    }
  }

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
        <p className="text-red-600">Ошибка при загрузке опросов. Попробуйте позже.</p>
      </div>
    )
  }

  const activeSurveys = surveys?.filter(s => s.status === 'Active').length || 0
  const completedSurveys = surveys?.filter(s => s.status === 'Completed').length || 0
  const draftSurveys = surveys?.filter(s => s.status === 'Draft').length || 0

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

      <h2 className="text-xl font-semibold mb-4 animate-fadeInUp">Мои опросы</h2>
      {surveys?.length === 0 ? (
        <div className="card text-center py-12 animate-fadeInUp">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">У вас пока нет опросов</p>
          <Link to="/survey/new" className="btn-primary inline-block mt-4">
            Создать первый опрос
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {surveys?.map((survey, index) => (
            <div
              key={survey.id}
              className="card hover:shadow-md transition-shadow animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-directum-dark">{survey.title}</h3>
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
                    <span>📅 {new Date(survey.startDate).toLocaleDateString('ru-RU')} — {new Date(survey.endDate).toLocaleDateString('ru-RU')}</span>
                    <span>👤 {survey.authorName}</span>
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
    </div>
  )
}