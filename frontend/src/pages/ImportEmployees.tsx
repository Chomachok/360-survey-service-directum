import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '../api/errors'
import { employeesQueryKey, importEmployees } from '../api/employees'

export default function ImportEmployees() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const mutation = useMutation({
    mutationFn: importEmployees,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: employeesQueryKey })
      toast.success('Импорт сотрудников завершён.')
      setFile(null)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Не удалось импортировать CSV-файл.')),
  })

  const handleImport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    mutation.mutate(formData)
  }

  return (
    <div className="mx-auto max-w-3xl animate-fadeInUp">
      <Link to="/employees" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-directum-orange dark:text-gray-400"><ArrowLeft size={17} /> К списку сотрудников</Link>
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-directum-orange dark:border-orange-900/50 dark:bg-orange-950/30"><FileSpreadsheet size={14} /> Загрузка данных</div>
        <h1 className="text-3xl font-bold text-directum-dark dark:text-white">Импорт сотрудников</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Загрузите CSV-файл, чтобы добавить сотрудников в справочник.</p>
      </div>

      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-directum-orange dark:bg-orange-950/40"><FileSpreadsheet size={23} /></div>
          <div><h2 className="font-semibold text-directum-dark dark:text-white">Файл сотрудников</h2><p className="text-sm text-gray-500 dark:text-gray-400">Поддерживается формат CSV</p></div>
        </div>
        <form onSubmit={handleImport} className="space-y-5">
          <div>
            <label htmlFor="employee-csv" className="label-field">CSV-файл</label>
            <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-directum-orange dark:border-gray-600">
              <input id="employee-csv" type="file" accept=".csv,text/csv" className="input-field file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-medium file:text-directum-orange dark:file:bg-orange-950/40" onChange={(event) => setFile(event.target.files?.[0] ?? null)} aria-describedby="csv-requirements" />
              <p className="mt-2 truncate text-sm text-gray-500 dark:text-gray-400">{file ? `Выбран файл: ${file.name}` : 'Выберите CSV-файл с компьютера'}</p>
            </div>
          </div>
          <div id="csv-requirements" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            <p className="font-semibold">Формат CSV</p>
            <p className="mt-1">Первая строка должна содержать заголовки <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/60">FullName</code> и <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/60">Email</code>; разделитель — запятая.</p>
          </div>
          <button type="submit" className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={!file || mutation.isPending}>
            <Upload size={17} /> {mutation.isPending ? 'Импорт…' : 'Импортировать сотрудников'}
          </button>
          {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300" role="alert">{getApiErrorMessage(mutation.error, 'Не удалось импортировать CSV-файл.')}</p>}
        </form>
      </section>
    </div>
  )
}
