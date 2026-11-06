import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertCircle, FileUp, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { getEmployees } from '../api/employees'
import LogoLoader from '../components/LogoLoader'

export default function Employees() {
  const { data: employees, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  })

  if (isLoading) return <LogoLoader label="Загрузка сотрудников…" />

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-directum-orange dark:border-orange-900/50 dark:bg-orange-950/30">
            <Users size={14} /> Справочник
          </div>
          <h1 className="page-title">Сотрудники</h1>
          <p className="page-description">Карточки сотрудников, доступные при настройке опросов 360.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/import" className="btn-secondary inline-flex items-center gap-2"><FileUp size={18} /> Импорт CSV</Link>
          <Link to="/employees/new" className="btn-primary inline-flex items-center gap-2"><Plus size={18} /> Добавить сотрудника</Link>
        </div>
      </div>

      {isError ? (
        <div className="card flex flex-col items-start gap-3 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" role="alert">
          <p className="flex items-center gap-2 text-red-700 dark:text-red-300"><AlertCircle size={18} /> Не удалось загрузить список сотрудников.</p>
          <button type="button" className="btn-secondary" onClick={() => void refetch()}>Попробовать снова</button>
        </div>
      ) : employees?.length ? (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 className="font-semibold text-directum-dark dark:text-white">Список сотрудников</h2>
            <span className="text-sm text-gray-500">{isFetching ? 'Обновление…' : `${employees.length} в списке`}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
                <tr><th scope="col" className="px-5 py-3">ФИО</th><th scope="col" className="px-5 py-3">Email</th><th scope="col" className="px-5 py-3 text-right">Действия</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {employees.map(employee => (
                  <tr key={employee.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50">
                    <td className="px-5 py-4 font-medium text-directum-dark dark:text-gray-100">{employee.fullName}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{employee.email || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Link to={`/employees/${employee.id}/edit`} className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40" aria-label={`Редактировать: ${employee.fullName}`} title="Редактировать"><Pencil size={17} /></Link>
                        <Link to={`/employees/${employee.id}/delete`} className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40" aria-label={`Удалить: ${employee.fullName}`} title="Удалить"><Trash2 size={17} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card py-12 text-center">
          <Users size={40} className="mx-auto mb-3 text-gray-300" />
          <h2 className="font-semibold text-directum-dark dark:text-white">Сотрудников пока нет</h2>
          <p className="mt-1 text-sm text-gray-500">Добавьте карточку вручную или загрузите CSV-файл.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/employees/new" className="btn-primary">Добавить сотрудника</Link>
            <Link to="/import" className="btn-secondary">Импортировать CSV</Link>
          </div>
        </div>
      )}
    </div>
  )
}
