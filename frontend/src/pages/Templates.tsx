import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTemplates, createTemplate } from '../api/questions'
import { useState } from 'react'
import { QuestionType } from '../types'
import { Plus, Copy } from 'lucide-react'

export default function Templates() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  })
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [type, setType] = useState<QuestionType>(QuestionType.Text)
  const [options, setOptions] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)

  const mutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setName('')
      setText('')
      setOptions([])
      setShowForm(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      name,
      text,
      type,
      options: type === QuestionType.SingleChoice ? options : undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-directum-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 animate-fadeInUp">
        <div>
          <h1 className="text-3xl font-bold text-directum-dark">Шаблоны вопросов</h1>
          <p className="text-gray-500 mt-1">Создавайте и управляйте шаблонами для быстрого добавления вопросов</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>{showForm ? 'Отменить' : 'Создать шаблон'}</span>
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 animate-fadeInUp">
          <h2 className="text-xl font-semibold text-directum-dark mb-4">Новый шаблон</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="animate-fadeInUp-delay">
                <label className="label-field">Название шаблона *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Например: Оценка компетенций"
                  required
                />
              </div>
              <div className="animate-fadeInUp-delay-2">
                <label className="label-field">Тип вопроса</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as QuestionType)}
                  className="input-field"
                >
                  <option value={QuestionType.Text}>Текстовый ответ</option>
                  <option value={QuestionType.SingleChoice}>Выбор одного варианта</option>
                </select>
              </div>
            </div>

            <div className="animate-fadeInUp-delay-3">
              <label className="label-field">Текст вопроса *</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="input-field"
                placeholder="Введите текст вопроса"
                required
              />
            </div>

            {type === QuestionType.SingleChoice && (
              <div className="animate-fadeInUp-delay-3">
                <label className="label-field">Варианты ответов</label>
                <input
                  type="text"
                  value={options.join(', ')}
                  onChange={(e) =>
                    setOptions(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                  }
                  className="input-field"
                  placeholder="Вариант 1, Вариант 2, Вариант 3"
                />
              </div>
            )}

            <button type="submit" className="btn-primary animate-fadeInUp" disabled={mutation.isPending}>
              {mutation.isPending ? 'Создание...' : 'Сохранить шаблон'}
            </button>
          </form>
        </div>
      )}

      {templates?.length === 0 ? (
        <div className="card text-center py-12 animate-fadeInUp">
          <Copy size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Шаблонов пока нет</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-block mt-4"
          >
            Создать первый шаблон
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates?.map((t, index) => (
            <div
              key={t.id}
              className="card hover:shadow-md transition-shadow animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <h3 className="font-semibold text-directum-dark">{t.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{t.text}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">
                  {t.type === QuestionType.Text ? 'Текст' : 'Выбор'}
                </span>
                {t.options && t.options.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {t.options.join(', ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}