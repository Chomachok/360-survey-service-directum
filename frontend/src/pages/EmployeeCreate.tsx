import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createEmployee, getEmployeeErrorMessage } from '../api/employees'
import type { EmployeeInput } from '../api/employees'
import EmployeeForm from '../components/EmployeeForm'

export default function EmployeeCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (values: EmployeeInput) => createEmployee(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Сотрудник добавлен.')
      navigate('/employees')
    },
    onError: error => toast.error(getEmployeeErrorMessage(error, 'Не удалось добавить сотрудника. Проверьте данные и попробуйте ещё раз.')),
  })

  return (
    <div className="max-w-3xl">
      <Link to="/employees" className="mb-6 inline-flex items-center text-sm text-gray-500 transition-colors hover:text-directum-orange"><ArrowLeft size={18} className="mr-2" /> К списку сотрудников</Link>
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-directum-orange dark:bg-orange-950/30"><UserPlus size={14} /> Новая карточка</div>
        <h1 className="page-title">Добавить сотрудника</h1>
        <p className="page-description">Заполните ФИО и рабочий email сотрудника.</p>
      </div>
      <EmployeeForm submitLabel="Добавить сотрудника" isSubmitting={mutation.isPending} onSubmit={values => mutation.mutate(values)} />
    </div>
  )
}
