import { useMemo } from 'react'
import { Check, Link, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Типы должны соответствовать тому, что приходит из getMatrix
interface MatrixItem {
  id: number
  evaluatorId: number
  evaluatorName: string
  targetId: number
  targetName: string
  token: string
  completed: boolean
}

interface MatrixGridProps {
  data: MatrixItem[]
  isDraft: boolean
  onDelete: (id: number, evaluatorName: string, targetName: string) => void
  onCopyLink: (token: string) => void
}

export function MatrixGrid({ data, isDraft, onDelete, onCopyLink }: MatrixGridProps) {
  // Трансформируем плоский список в структуру для отображения
  const { targets, evaluators, matrixMap } = useMemo(() => {
    const targetSet = new Map<number, string>()
    const evaluatorSet = new Map<number, string>()
    const map = new Map<string, MatrixItem>()

    if (!data) return { targets: [], evaluators: [], matrixMap: map }

    data.forEach((item) => {
      targetSet.set(item.targetId, item.targetName)
      evaluatorSet.set(item.evaluatorId, item.evaluatorName)
      // Ключ для быстрого поиска: "targetId-evaluatorId"
      map.set(`${item.targetId}-${item.evaluatorId}`, item)
    })

    // Сортируем для стабильного отображения
    const targets = Array.from(targetSet.entries()).map(([id, name]) => ({ id, name }))
    const evaluators = Array.from(evaluatorSet.entries()).map(([id, name]) => ({ id, name }))

    return { targets, evaluators, matrixMap: map }
  }, [data])

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
        <p>Матрица пуста. Добавьте связи выше или примените шаблон.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 animate-fadeInUp">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr>
            {/* Верхний левый угол */}
            <th className="sticky left-0 z-20 bg-gray-100 dark:bg-gray-900 p-3 border-b border-r border-gray-300 dark:border-gray-600">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                Оцениваемый ↓ / Оценивающий →
              </div>
            </th>
            
            {/* Заголовки столбцов (Оценивающие) */}
            {evaluators.map((ev) => (
              <th 
                key={ev.id} 
                className="bg-gray-50 dark:bg-gray-800 p-3 border-b border-r border-gray-200 dark:border-gray-700 min-w-[140px]"
              >
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center truncate" title={ev.name}>
                  {ev.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Строки (Оцениваемые) */}
          {targets.map((target) => (
            <tr key={target.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
              {/* Заголовок строки */}
              <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 p-3 border-b border-r border-gray-200 dark:border-gray-700 font-medium text-sm text-gray-800 dark:text-gray-200">
                {target.name}
              </td>

              {/* Ячейки матрицы */}
              {evaluators.map((evaluator) => {
                const key = `${target.id}-${evaluator.id}`
                const item = matrixMap.get(key)
                const isSelf = target.id === evaluator.id

                return (
                  <td 
                    key={key} 
                    className={`border-b border-r border-gray-100 dark:border-gray-800 p-2 text-center align-middle ${
                      isSelf ? 'bg-gray-100/50 dark:bg-gray-800/50' : ''
                    }`}
                  >
                    {isSelf ? (
                      <span className="text-xs text-gray-400 italic">—</span>
                    ) : item ? (
                      <div className="flex items-center justify-center gap-1 group">
                        {item.completed ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" title="Завершено">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        ) : (
                          <button
                            onClick={() => onCopyLink(item.token)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-directum-orange/10 text-directum-orange hover:bg-directum-orange hover:text-white transition-all duration-200"
                            title="Копировать ссылку"
                          >
                            <Link size={12} />
                          </button>
                        )}
                        
                        {isDraft && !item.completed && (
                          <button
                            onClick={() => onDelete(item.id, evaluator.name, target.name)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                            title="Удалить связь"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}