import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { deleteEmployee, getEmployees, getEmployeeErrorMessage } from '../api/employees'
import LogoLoader from '../components/LogoLoader'

export default function EmployeeDelete() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const employeesQuery = useQuery({ queryKey: ['employees'], queryFn: getEmployees })
  const employee = employeesQuery.data?.find(item => item.id === id)
  const mutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Сотрудник удалён.')
      navigate('/employees')
    },
    onError: error => toast.error(getEmployeeErrorMessage(error, 'Не удалось удалить сотрудника.')),
  })

  if (!Number.isInteger(id) || id <= 0) return <p className="card text-red-600">Некорректный идентификатор сотрудника.</p>
  if (employeesQuery.isLoading) return <LogoLoader label="Загрузка карточки сотрудника…" />
  if (employeesQuery.isError) return <div className="card text-red-600" role="alert">Не удалось загрузить карточку сотрудника. <Link to="/employees" className="underline">Вернуться к списку</Link></div>
  if (!employee) return <div className="card">Сотрудник не найден. <Link to="/employees" className="text-directum-orange underline">Вернуться к списку</Link></div>

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/employees" className="mb-6 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-directum-orange"><ArrowLeft size={18} className="mr-2" /> К списку сотрудников</Link>
      <section className="card border-red-200 dark:border-red-900" aria-labelledby="delete-employee-title">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"><AlertTriangle size={24} /></div>
        <h1 id="delete-employee-title" className="page-title">Удалить сотрудника?</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">Карточка <strong className="text-directum-dark dark:text-white">{employee.fullName}</strong> ({employee.email}) будет удалена из справочника. Это действие нельзя отменить.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={mutation.isPending} onClick={() => mutation.mutate(id)}>
            <Trash2 size={17} /> {mutation.isPending ? 'Удаление…' : 'Подтвердить удаление'}
          </button>
          <button type="button" className="btn-secondary" disabled={mutation.isPending} onClick={() => navigate('/employees')}>Отмена</button>
        </div>
      </section>
    </div>
  )
}
