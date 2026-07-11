import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getResults, exportDocx } from '../api/results'
import { ArrowLeft, Download, User } from 'lucide-react'

export default function Results() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const surveyId = parseInt(id!)

  const { data, isLoading } = useQuery({
    queryKey: ['results', surveyId],
    queryFn: () => getResults(surveyId),
  })

  const handleExport = () => {
    exportDocx(surveyId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-directum-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data || data.results.length === 0) {
    return (
      <div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-500 hover:text-directum-dark mb-6 transition-colors animate-fadeInUp"
        >
          <ArrowLeft size={20} className="mr-2" />
          Назад к дашборду
        </button>
        <div className="card text-center py-12 animate-fadeInUp">
          <User size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Пока нет завершённых ответов</p>
          <p className="text-sm text-gray-400">Результаты появятся после того, как респонденты пройдут опрос</p>
        </div>
      </div>
    )
  }

  const roleLabels: Record<string, string> = {
    SelfAssessment: 'Самооценка',
    Manager: 'Руководитель',
    Colleague: 'Коллеги',
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

      <div className="flex justify-between items-center mb-6 animate-fadeInUp">
        <div>
          <h1 className="text-2xl font-bold text-directum-dark">Результаты опроса</h1>
          <p className="text-gray-500">{data.surveyTitle}</p>
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center space-x-2">
          <Download size={18} />
          <span>Экспорт DOCX</span>
        </button>
      </div>

      <div className="space-y-6">
        {data.results.map((employee, index) => (
          <div
            key={employee.employeeId}
            className="card animate-fadeInUp"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-directum-orange flex items-center justify-center text-white font-semibold">
                {employee.employeeName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-directum-dark">{employee.employeeName}</h3>
                <p className="text-sm text-gray-500">Оцениваемый сотрудник</p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(employee.answersByRole).map(([role, answers]) => (
                <div key={role} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 animate-fadeInUp">
                  <h4 className="text-sm font-medium text-directum-orange mb-3">
                    {roleLabels[role] || role}
                  </h4>
                  <div className="space-y-2">
                    {answers.map((qa, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400 sm:w-1/2 flex-shrink-0">
                          {qa.questionText}
                        </span>
                        <span className="font-medium text-directum-dark">
                          {qa.answerText || qa.selectedOption || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}