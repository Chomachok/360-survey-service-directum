import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getResults, exportDocx } from '../api/results'
import { ArrowLeft, Download, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { EmployeeResultDto, EvaluatorResultDto, QuestionAnswerDto } from '../types'
import LogoLoader from '../components/LogoLoader'

export default function Results() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const surveyId = parseInt(id!)
  const [expandedEmployees, setExpandedEmployees] = useState<Set<number>>(new Set())
  const [expandedEvaluators, setExpandedEvaluators] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['results', surveyId],
    queryFn: () => getResults(surveyId),
  })

  const handleExport = () => {
    exportDocx(surveyId)
  }

  const toggleEmployee = (employeeId: number) => {
    const newSet = new Set(expandedEmployees)
    if (newSet.has(employeeId)) newSet.delete(employeeId)
    else newSet.add(employeeId)
    setExpandedEmployees(newSet)
  }

  const toggleEvaluator = (key: string) => {
    const newSet = new Set(expandedEvaluators)
    if (newSet.has(key)) newSet.delete(key)
    else newSet.add(key)
    setExpandedEvaluators(newSet)
  }

  if (isLoading) {
    return (
      <LogoLoader />
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
          <Users size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Пока нет завершённых ответов</p>
          <p className="text-sm text-gray-400">Результаты появятся после того, как респонденты пройдут опрос</p>
        </div>
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

      <div className="flex justify-between items-center mb-6 animate-fadeInUp">
        <div className="min-w-0 overflow-hidden">
          <h1 className="text-2xl font-bold text-directum-dark">Результаты опроса</h1>
          <p className="text-gray-500 break-words overflow-hidden">{data.surveyTitle}</p>
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center space-x-2">
          <Download size={18} />
          <span>Экспорт DOCX</span>
        </button>
      </div>

      <div className="space-y-4">
        {data.results.map((employee: EmployeeResultDto) => {
          const isEmployeeExpanded = expandedEmployees.has(employee.employeeId)
          return (
            <div key={employee.employeeId} className="card animate-fadeInUp">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleEmployee(employee.employeeId)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-directum-orange flex items-center justify-center text-white font-semibold">
                    {employee.employeeName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-directum-dark">{employee.employeeName}</h3>
                    <span className="text-sm text-gray-500">
                      {employee.evaluators.length} оценщиков
                    </span>
                  </div>
                </div>
                <div className="text-gray-400">
                  {isEmployeeExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isEmployeeExpanded && (
                <div className="mt-4 space-y-4">
                  {employee.evaluators.map((evaluator: EvaluatorResultDto) => {
                    const key = `${employee.employeeId}-${evaluator.evaluatorId}`
                    const isEvaluatorExpanded = expandedEvaluators.has(key)
                    return (
                      <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleEvaluator(key)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-sm">
                              {evaluator.evaluatorName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-directum-dark">{evaluator.evaluatorName}</span>
                          </div>
                          <div className="text-gray-400">
                            {isEvaluatorExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>

                        {isEvaluatorExpanded && (
                          <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                            {evaluator.answers.map((qa: QuestionAnswerDto, idx: number) => (
                              <div key={idx} className="text-sm">
                                <div className="text-gray-600 dark:text-gray-400">
                                  {qa.questionText}
                                </div>
                                <div className="font-medium text-directum-dark">
                                  {qa.answerText || qa.selectedOption || '—'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}