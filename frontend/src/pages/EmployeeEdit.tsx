import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateEmployee, getEmployees, getEmployeeErrorMessage } from '../api/employees'
import type { EmployeeInput } from '../api/employees'
import EmployeeForm from '../components/EmployeeForm'
import LogoLoader from '../components/LogoLoader'

export default function EmployeeEdit() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const employeesQuery = useQuery({ queryKey: ['employees'], queryFn: getEmployees })
  const employee = employeesQuery.data?.find(item => item.id === id)
  const mutation = useMutation({
    mutationFn: (values: EmployeeInput) => updateEmployee(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Карточка сотрудника обновлена.')
      navigate('/employees')
    },
    onError: error => toast.error(getEmployeeErrorMessage(error, 'Не удалось обновить карточку сотрудника.')),
  })

  if (!Number.isInteger(id) || id <= 0) return <p className="card text-red-600">Некорректный идентификатор сотрудника.</p>
  if (employeesQuery.isLoading) return <LogoLoader label="Загрузка карточки сотрудника…" />
  if (employeesQuery.isError) return <div className="card text-red-600" role="alert">Не удалось загрузить карточку сотрудника. <Link to="/employees" className="underline">Вернуться к списку</Link></div>
  if (!employee) return <div className="card">Сотрудник не найден. <Link to="/employees" className="text-directum-orange underline">Вернуться к списку</Link></div>

  return (
    <div className="max-w-3xl">
      <Link to="/employees" className="mb-6 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-directum-orange"><ArrowLeft size={18} className="mr-2" /> К списку сотрудников</Link>
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:bg-blue-950/30 dark:text-blue-300"><Pencil size={14} /> Редактирование</div>
        <h1 className="page-title">Обновить карточку</h1>
        <p className="page-description">Измените данные сотрудника {employee.fullName}.</p>
      </div>
      <EmployeeForm initialValues={{ fullName: employee.fullName, email: employee.email }} submitLabel="Сохранить изменения" isSubmitting={mutation.isPending} onSubmit={values => mutation.mutate(values)} />
    </div>
  )
}
