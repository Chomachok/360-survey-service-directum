import { useQuery } from '@tanstack/react-query'
import { getUserSurveys } from '../api/user'
import { Link } from 'react-router-dom'
import { ClipboardList, CheckCircle, Clock } from 'lucide-react'

export default function UserDashboard() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['userSurveys'],
    queryFn: getUserSurveys,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-directum-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50">
        <p className="text-red-600">Не удалось загрузить опросы. Попробуйте позже.</p>
      </div>
    )
  }

  if (!surveys || surveys.length === 0) {
    return (
      <div className="card text-center py-12">
        <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">У вас пока нет назначенных опросов</p>
        <p className="text-sm text-gray-400">Когда вам назначат опрос, он появится здесь</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-directum-dark mb-6">Мои опросы</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {surveys.map((survey) => (
          <div key={survey.token} className="card hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-directum-dark">{survey.surveyTitle}</h3>
                <p className="text-sm text-gray-500">Для: {survey.targetName}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                survey.completed
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {survey.completed ? (
                  <span className="flex items-center gap-1"><CheckCircle size={12} /> Завершён</span>
                ) : (
                  <span className="flex items-center gap-1"><Clock size={12} /> Ожидает</span>
                )}
              </span>
            </div>
            {!survey.completed && (
              <Link
                to={`/survey/${survey.token}`}
                className="mt-3 inline-block btn-primary text-sm px-4 py-2"
              >
                Пройти опрос
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}