import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatrix, addMatrixItem, deleteMatrixItem } from '../api/matrix'
import { getEmployees } from '../api/employees'
import { useState } from 'react'
import { AssessmentRole } from '../types'
import { ArrowLeft, Plus, Trash2, Link, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Matrix() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const surveyId = parseInt(id!)
  const queryClient = useQueryClient()

  const { data: matrix, isLoading: mLoading } = useQuery({
    queryKey: ['matrix', surveyId],
    queryFn: () => getMatrix(surveyId),
  })
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  })

  const [evaluatorId, setEvaluatorId] = useState<number | ''>('')
  const [targetId, setTargetId] = useState<number | ''>('')
  const [role, setRole] = useState<AssessmentRole>(AssessmentRole.Colleague)

  const addMutation = useMutation({
    mutationFn: (data: any) => addMatrixItem(surveyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      setEvaluatorId('')
      setTargetId('')
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
      toast.success('Связь удалена')
    },
    onError: (error: any) => {
      toast.error('Не удалось удалить связь')
    },
  })

  const handleAdd = () => {
    if (!evaluatorId || !targetId) {
      toast.error('Выберите оценивающего и оцениваемого сотрудника')
      return
    }

    if (evaluatorId === targetId && role !== AssessmentRole.SelfAssessment) {
      toast.error('Для самооценки выберите роль "Самооценка"')
      return
    }

    addMutation.mutate({
      evaluatorId: Number(evaluatorId),
      targetId: Number(targetId),
      role,
    })
  }

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/survey/${token}`
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success('Ссылка скопирована в буфер обмена!', {
          icon: '📋',
          duration: 3000,
        })
      })
      .catch(() => {
        toast.error('Не удалось скопировать ссылку. Скопируйте её вручную.')
      })
  }

  const roleLabels = {
    [AssessmentRole.SelfAssessment]: 'Самооценка',
    [AssessmentRole.Manager]: 'Руководитель',
    [AssessmentRole.Colleague]: 'Коллега',
  }

  if (mLoading) {
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

        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-fadeInUp-delay">
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Кто оценивает
            </label>
            <select
              value={evaluatorId}
              onChange={(e) => setEvaluatorId(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field"
            >
              <option value="">Выберите сотрудника</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Кого оценивают
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field"
            >
              <option value="">Выберите сотрудника</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Роль
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AssessmentRole)}
              className="input-field"
            >
              <option value={AssessmentRole.SelfAssessment}>Самооценка</option>
              <option value={AssessmentRole.Manager}>Руководитель</option>
              <option value={AssessmentRole.Colleague}>Коллега</option>
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

        {matrix?.length === 0 ? (
          <div className="text-center py-8 text-gray-500 animate-fadeInUp">
            <p>Матрица пуста</p>
            <p className="text-sm">Добавьте связи между сотрудниками</p>
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
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:scale-110 transform"
                        title="Удалить"
                        disabled={deleteMutation.isPending}
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
    </div>
  )
}