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
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['results', surveyId],
    queryFn: () => getResults(surveyId),
  })

  const handleExportDocx = () => {
    exportDocx(surveyId)
  }

  const toggleEmployee = (employeeId: number) => {
    const newSet = new Set(expandedEmployees)
    if (newSet.has(employeeId)) newSet.delete(employeeId)
    else newSet.add(employeeId)
    setExpandedEmployees(newSet)
  }

  const toggleQuestion = (key: string) => {
    const newSet = new Set(expandedQuestions)
    if (newSet.has(key)) newSet.delete(key)
    else newSet.add(key)
    setExpandedQuestions(newSet)
  }

  if (isLoading) {
    return <LogoLoader />
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
        <button onClick={handleExportDocx} className="btn-primary flex items-center space-x-2">
          <Download size={18} />
          <span>Экспорт DOCX</span>
        </button>
      </div>

      <div className="space-y-6">
        {data.results.map((employee: EmployeeResultDto) => {
          const isEmployeeExpanded = expandedEmployees.has(employee.employeeId)

          // Группируем ответы по вопросам для этого сотрудника
          const questionAnswers = new Map<string, { evaluatorName: string; answer: string }[]>()

          employee.evaluators.forEach((evaluator: EvaluatorResultDto) => {
            evaluator.answers.forEach((qa: QuestionAnswerDto) => {
              if (!questionAnswers.has(qa.questionText)) {
                questionAnswers.set(qa.questionText, [])
              }
              const answerText = qa.answerText || qa.selectedOption || 'Нет ответа'
              questionAnswers.get(qa.questionText)!.push({
                evaluatorName: evaluator.evaluatorName,
                answer: answerText,
              })
            })
          })

          return (
            <div key={employee.employeeId} className="card animate-fadeInUp">
              {/* Заголовок сотрудника (кликабельный) */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleEmployee(employee.employeeId)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-directum-orange flex items-center justify-center text-white font-semibold">
                    {employee.employeeName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-directum-dark">{employee.employeeName}</h3>
                    <p className="text-sm text-gray-500">
                      {employee.evaluators.length} оценщиков
                    </p>
                  </div>
                </div>
                <div className="text-gray-400">
                  {isEmployeeExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Вопросы сотрудника (видны только если сотрудник развернут) */}
              {isEmployeeExpanded && (
                <div className="mt-4 space-y-4">
                  {Array.from(questionAnswers.entries()).map(([questionText, answers]) => {
                    const questionKey = `${employee.employeeId}-${questionText}`
                    const isQuestionExpanded = expandedQuestions.has(questionKey)

                    return (
                      <div key={questionText} className="border-l-2 border-directum-orange pl-4">
                        {/* Заголовок вопроса (кликабельный) */}
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleQuestion(questionKey)}
                        >
                          <h4 className="text-base font-semibold text-directum-orange">
                            {questionText}
                          </h4>
                          <div className="text-gray-400">
                            {isQuestionExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        {/* Ответы на вопрос (видны только если вопрос развернут) */}
                        {isQuestionExpanded && (
                          <div className="mt-2 space-y-1">
                            {answers.map((item, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium text-directum-dark">{item.evaluatorName}:</span>
                                <span className="text-gray-700 dark:text-gray-300 ml-1">{item.answer}</span>
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