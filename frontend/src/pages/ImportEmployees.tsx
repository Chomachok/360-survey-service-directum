import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { importEmployees } from '../api/employees'
import { ArrowLeft, Upload, FileSpreadsheet } from 'lucide-react'

export default function ImportEmployees() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)

  const mutation = useMutation({
    mutationFn: (formData: FormData) => importEmployees(formData),
    onSuccess: () => {
      alert('Сотрудники успешно импортированы!')
      setFile(null)
    },
    onError: () => {
      alert('Ошибка при импорте. Проверьте формат файла.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    mutation.mutate(formData)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-gray-500 hover:text-directum-dark mb-6 transition-colors animate-fadeInUp"
      >
        <ArrowLeft size={20} className="mr-2" />
        Назад к дашборду
      </button>

      <div className="card animate-fadeInUp">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-directum-yellow flex items-center justify-center">
            <FileSpreadsheet className="text-directum-orange" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-directum-dark">Импорт сотрудников</h1>
            <p className="text-gray-500">Загрузите файл с данными сотрудников</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-directum-orange transition-colors animate-fadeInUp-delay">
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <Upload size={40} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                {file ? file.name : 'Нажмите для выбора файла'}
              </span>
              <span className="text-xs text-gray-400">Поддерживаются форматы CSV и XLSX</span>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 animate-fadeInUp-delay-2">
            <p className="font-medium">Требования к файлу:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Первая строка — заголовки: <code className="bg-blue-100 px-1 rounded">FullName</code> и <code className="bg-blue-100 px-1 rounded">Email</code></li>
              <li>Разделитель — запятая или точка с запятой</li>
            </ul>
          </div>

          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center space-x-2 animate-fadeInUp"
            disabled={!file || mutation.isPending}
          >
            <Upload size={18} />
            <span>{mutation.isPending ? 'Импорт...' : 'Импортировать сотрудников'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}