import { useMemo, useState } from 'react'
import { Check, Link, Trash2, Plus, X } from 'lucide-react'
import Select from 'react-select'
import { reactSelectStyles } from '../styles/reactSelectStyles'

interface MatrixItem {
  id: number
  evaluatorId: number
  evaluatorName: string
  targetId: number
  targetName: string
  token: string
  completed: boolean
}

interface EmployeeOption {
  value: number
  label: string
}

interface MatrixGridProps {
  data: MatrixItem[]
  employees: EmployeeOption[]
  isDraft: boolean
  onDelete: (id: number, evaluatorName: string, targetName: string) => void
  onCopyLink: (token: string) => void
  onAdd: (evaluatorId: number, targetId: number) => void
  isAdding: boolean
}

export function MatrixGrid({ 
  data, 
  employees, 
  isDraft, 
  onDelete, 
  onCopyLink, 
  onAdd,
  isAdding 
}: MatrixGridProps) {
  // Состояние для инлайн-добавления: { type: 'row' | 'col', id: number }
  const [addingMode, setAddingMode] = useState<{ type: 'row' | 'col'; id: number } | null>(null)
  const [selectedNewUser, setSelectedNewUser] = useState<EmployeeOption | null>(null)

  const { targets, evaluators, matrixMap } = useMemo(() => {
    const targetSet = new Map<number, string>()
    const evaluatorSet = new Map<number, string>()
    const map = new Map<string, MatrixItem>()

    if (!data) return { targets: [], evaluators: [], matrixMap: map }

    data.forEach((item) => {
      targetSet.set(item.targetId, item.targetName)
      evaluatorSet.set(item.evaluatorId, item.evaluatorName)
      map.set(`${item.targetId}-${item.evaluatorId}`, item)
    })

    const targets = Array.from(targetSet.entries()).map(([id, name]) => ({ id, name }))
    const evaluators = Array.from(evaluatorSet.entries()).map(([id, name]) => ({ id, name }))

    return { targets, evaluators, matrixMap: map }
  }, [data])

  const handleStartAdding = (type: 'row' | 'col', id: number) => {
    setAddingMode({ type, id })
    setSelectedNewUser(null)
  }

  const handleCancelAdding = () => {
    setAddingMode(null)
    setSelectedNewUser(null)
  }

  const handleSubmitAdd = () => {
    if (!selectedNewUser || !addingMode) return
    
    if (addingMode.type === 'row') {
      // Добавляем оценивающего к существующему target
      onAdd(selectedNewUser.value, addingMode.id)
    } else {
      // Добавляем оцениваемого к существующему evaluator
      onAdd(addingMode.id, selectedNewUser.value)
    }
    
    // Сброс произойдет автоматически после успешного добавления 
    // через инвалидацию запроса в родительском компоненте
  }

  // Фильтруем сотрудников, которые еще не участвуют в текущей операции добавления
  const getFilteredOptions = () => {
    if (!addingMode) return employees
    
    if (addingMode.type === 'row') {
      // Исключаем тех, кто уже оценивает этого target
      return employees.filter(emp => 
        !matrixMap.has(`${addingMode.id}-${emp.value}`) && emp.value !== addingMode.id
      )
    } else {
      // Исключаем тех, кого уже оценивает этот evaluator
      return employees.filter(emp => 
        !matrixMap.has(`${emp.value}-${addingMode.id}`) && emp.value !== addingMode.id
      )
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
        <p>Матрица пуста. Добавьте первую связь через форму выше.</p>
      </div>
    )
  }

  const filteredOptions = getFilteredOptions()

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 animate-fadeInUp">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-gray-100 dark:bg-gray-900 p-3 border-b border-r border-gray-300 dark:border-gray-600">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                Оцениваемый ↓ / Оценивающий →
              </div>
            </th>
            
            {evaluators.map((ev) => (
              <th key={ev.id} className="bg-gray-50 dark:bg-gray-800 p-3 border-b border-r border-gray-200 dark:border-gray-700 min-w-[140px]">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center truncate" title={ev.name}>
                  {ev.name}
                </div>
              </th>
            ))}
            
            {/* Кнопка добавления столбца (нового оценивающего) */}
            {isDraft && (
              <th className="bg-gray-50 dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700 w-12">
                {!addingMode ? (
                  <button 
                    onClick={() => handleStartAdding('col', 0)} // 0 - спец. маркер для нового столбца
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-directum-orange/10 text-directum-orange hover:bg-directum-orange hover:text-white transition-all"
                    title="Добавить нового оценивающего"
                  >
                    <Plus size={18} />
                  </button>
                ) : addingMode.type === 'col' && addingMode.id === 0 ? (
                   <div className="flex flex-col gap-1 min-w-[160px]">
                     <Select
                        options={filteredOptions}
                        value={selectedNewUser}
                        onChange={(opt) => setSelectedNewUser(opt)}
                        placeholder="Выберите..."
                        styles={reactSelectStyles}
                        menuPortalTarget={document.body}
                        autoFocus
                        openMenuOnFocus
                      />
                      <div className="flex gap-1 mt-1">
                        <button onClick={handleSubmitAdd} disabled={!selectedNewUser || isAdding} className="flex-1 text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 disabled:opacity-50">
                          {isAdding ? '...' : 'OK'}
                        </button>
                        <button onClick={handleCancelAdding} className="flex-1 text-xs bg-gray-300 text-gray-700 rounded px-2 py-1 hover:bg-gray-400">
                          ✕
                        </button>
                      </div>
                   </div>
                ) : null}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => (
            <tr key={target.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
              <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 p-3 border-b border-r border-gray-200 dark:border-gray-700 font-medium text-sm text-gray-800 dark:text-gray-200">
                {target.name}
              </td>

              {evaluators.map((evaluator) => {
                const key = `${target.id}-${evaluator.id}`
                const item = matrixMap.get(key)
                const isSelf = target.id === evaluator.id

                return (
                  <td key={key} className={`border-b border-r border-gray-100 dark:border-gray-800 p-2 text-center align-middle ${isSelf ? 'bg-gray-100/50 dark:bg-gray-800/50' : ''}`}>
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

              {/* Кнопка добавления в строку (нового оценивающего для этого target) */}
              {isDraft && (
                <td className="border-b border-gray-100 dark:border-gray-800 p-2 text-center">
                  {addingMode?.type === 'row' && addingMode.id === target.id ? (
                    <div className="flex items-center gap-1 min-w-[160px]">
                      <Select
                        options={filteredOptions}
                        value={selectedNewUser}
                        onChange={(opt) => setSelectedNewUser(opt)}
                        placeholder="Кто оценивает?"
                        styles={{
                          ...reactSelectStyles,
                          control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' }),
                        }}
                        menuPortalTarget={document.body}
                        autoFocus
                        openMenuOnFocus
                      />
                      <button onClick={handleSubmitAdd} disabled={!selectedNewUser || isAdding} className="text-green-600 hover:bg-green-50 p-1 rounded">
                        {isAdding ? '...' : <Check size={16} />}
                      </button>
                      <button onClick={handleCancelAdding} className="text-gray-400 hover:bg-gray-50 p-1 rounded">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleStartAdding('row', target.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-directum-orange hover:bg-directum-orange/10 transition-all opacity-30 hover:opacity-100"
                      title={`Добавить оценивающего для ${target.name}`}
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          
          {/* Строка для добавления нового оцениваемого (внизу) */}
          {isDraft && (
            <tr>
              <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 p-2 border-t border-r border-gray-200 dark:border-gray-700">
                 {addingMode?.type === 'col' && addingMode.id !== 0 ? (
                    <div className="flex flex-col gap-1 min-w-[160px]">
                      <Select
                        options={employees.filter(e => !targets.some(t => t.id === e.value))}
                        value={selectedNewUser}
                        onChange={(opt) => setSelectedNewUser(opt)}
                        placeholder="Кого оценивать?"
                        styles={{
                          ...reactSelectStyles,
                          control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' }),
                        }}
                        menuPortalTarget={document.body}
                        autoFocus
                        openMenuOnFocus
                      />
                      <div className="flex gap-1">
                        <button onClick={handleSubmitAdd} disabled={!selectedNewUser || isAdding} className="flex-1 text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 disabled:opacity-50">
                          {isAdding ? '...' : 'OK'}
                        </button>
                        <button onClick={handleCancelAdding} className="flex-1 text-xs bg-gray-300 text-gray-700 rounded px-2 py-1 hover:bg-gray-400">✕</button>
                      </div>
                    </div>
                 ) : (
                   <button 
                      onClick={() => handleStartAdding('col', -1)} // -1 маркер для новой строки
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-directum-orange transition-colors"
                    >
                      <Plus size={16} />
                      <span>Добавить оцениваемого</span>
                    </button>
                 )}
              </td>
              {evaluators.map(ev => (
                <td key={`add-row-${ev.id}`} className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/30"></td>
              ))}
              {isDraft && <td className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/30"></td>}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
/*проверь это запускает? <MatrixGrid 
  data={matrix || []} 
  employees={evaluatorOptions} // Используем уже подготовленные опции
  isDraft={isDraft}
  onDelete={handleDeleteClick}
  onCopyLink={handleCopyLink}
  onAdd={(evaluatorId, targetId) => addMutation.mutate({ evaluatorId, targetId })}
  isAdding={addMutation.isPending}
/>*/