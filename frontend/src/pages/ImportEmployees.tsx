import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importEmployees, createEmployee } from '../api/employees'
import { ArrowLeft, Upload, FileSpreadsheet, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ImportEmployees() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)

  // Состояния для ручного добавления
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({})

  const importMutation = useMutation({
    mutationFn: (formData: FormData) => importEmployees(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Сотрудники успешно импортированы!')
      setFile(null)
    },
    onError: () => {
      toast.error('Ошибка при импорте. Проверьте формат файла.')
    },
  })

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Сотрудник успешно создан!')
      setFullName('')
      setEmail('')
      setErrors({})
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Не удалось создать сотрудника'
      toast.error(message)
    },
  })

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    importMutation.mutate(formData)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    // Валидация
    const newErrors: { fullName?: string; email?: string } = {}
    if (!fullName.trim()) newErrors.fullName = 'Введите ФИО'
    if (!email.trim()) newErrors.email = 'Введите Email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Введите корректный Email'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    createMutation.mutate({ fullName, email })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-gray-500 hover:text-directum-dark mb-6 transition-colors animate-fadeInUp dark:text-gray-100"
      >
        <ArrowLeft size={20} className="mr-2" />
        Назад к дашборду
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Левая колонка – импорт файла */}
        <div className="card animate-fadeInUp">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-directum-yellow flex items-center justify-center">
              <FileSpreadsheet className="text-directum-orange" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-directum-dark dark:text-gray-100">Импорт CSV</h2>
              <p className="text-sm text-gray-500">Загрузите файл с сотрудниками</p>
            </div>
          </div>

          <form onSubmit={handleImport} className="mt-4 space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-directum-orange transition-colors">
              <input
                type="file"
                id="file-upload"
                accept=".csv,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                <Upload size={32} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  {file ? file.name : 'Нажмите для выбора файла'}
                </span>
                <span className="text-xs text-gray-400">CSV или XLSX</span>
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <p className="font-medium">Требования к файлу:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Заголовки: <code className="bg-blue-100 px-1 rounded">FullName</code> и <code className="bg-blue-100 px-1 rounded">Email</code></li>
                <li>Разделитель: запятая или точка с запятой</li>
              </ul>
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center space-x-2"
              disabled={!file || importMutation.isPending}
            >
              <Upload size={18} />
              <span>{importMutation.isPending ? 'Импорт...' : 'Импортировать'}</span>
            </button>
          </form>
        </div>

        {/* Правая колонка – ручное добавление */}
        <div className="card animate-fadeInUp-delay">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-directum-orange/10 flex items-center justify-center">
              <UserPlus className="text-directum-orange" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-directum-dark dark:text-gray-100">Добавить вручную</h2>
              <p className="text-sm text-gray-500">Создать одного сотрудника</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div>
              <label className="label-field">ФИО *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  setErrors((prev) => ({ ...prev, fullName: undefined }))
                }}
                className={`input-field ${errors.fullName ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Иванов Иван Иванович"
              />
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="label-field">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors((prev) => ({ ...prev, email: undefined }))
                }}
                className={`input-field ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="ivanov@example.com"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center space-x-2"
              disabled={createMutation.isPending}
            >
              <UserPlus size={18} />
              <span>{createMutation.isPending ? 'Создание...' : 'Создать сотрудника'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}