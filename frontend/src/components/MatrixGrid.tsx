import React, { useMemo, useState } from 'react';
import { Plus, X, Check, Link as LinkIcon, Trash2 } from 'lucide-react';
import Select from 'react-select';
import { reactSelectStyles } from '../styles/reactSelectStyles';
import toast from 'react-hot-toast';

// Типы данных
interface MatrixItem {
  id: number;
  evaluatorId: number;
  evaluatorName: string;
  targetId: number;
  targetName: string;
  token: string;
  completed: boolean;
}

interface EmployeeOption {
  value: number;
  label: string;
}

interface SurveyMatrixProps {
  data: MatrixItem[];
  employees: EmployeeOption[];
  isDraft: boolean;
  onAdd: (evaluatorId: number, targetId: number) => void;
  onDelete: (id: number, evaluatorName: string, targetName: string) => void;
  onCopyLink: (token: string) => void;
  isMutating: boolean;
}

export const SurveyMatrix: React.FC<SurveyMatrixProps> = ({
  data,
  employees,
  isDraft,
  onAdd,
  onDelete,
  onCopyLink,
  isMutating,
}) => {
  // Состояния для режимов добавления
  const [addingMode, setAddingMode] = useState<{ type: 'row' | 'col'; id?: number } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  // Преобразование плоского списка в структуру матрицы
  const { subjects, respondents, matrixMap } = useMemo(() => {
    const subjectSet = new Map<number, string>(); // Кандидаты (столбцы)
    const respondentSet = new Map<number, string>(); // Эксперты (строки)
    const map = new Map<string, MatrixItem>();

    data.forEach((item) => {
      subjectSet.set(item.targetId, item.targetName);
      respondentSet.set(item.evaluatorId, item.evaluatorName);
      map.set(`${item.evaluatorId}_${item.targetId}`, item);
    });

    return {
      subjects: Array.from(subjectSet.entries()).map(([id, name]) => ({ id, name })),
      respondents: Array.from(respondentSet.entries()).map(([id, name]) => ({ id, name })),
      matrixMap: map,
    };
  }, [data]);

  // Статистика
  const stats = useMemo(() => {
    const total = subjects.length * respondents.length;
    const evaluated = Array.from(matrixMap.values()).filter(i => i.completed).length;
    const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    return { total, evaluated, percentage };
  }, [subjects, respondents, matrixMap]);

  // Фильтрация доступных сотрудников (исключаем уже добавленных)
  const availableSubjects = employees.filter(e => !subjects.some(s => s.id === e.value));
  const availableRespondents = employees.filter(e => !respondents.some(r => r.id === e.value));

  // Обработчик подтверждения добавления
  const handleConfirmAdd = () => {
    if (!selectedEmployee || !addingMode) return;

    if (addingMode.type === 'col') {
      // Добавляем столбец (Кандидата). 
      // Создаем связь с ПЕРВЫМ доступным экспертом, чтобы столбец появился визуально.
      // Если экспертов нет, добавление невозможно (защита ниже).
      if (respondents.length === 0) {
        toast.error('Сначала добавьте хотя бы одного эксперта (строку)');
        return;
      }
      onAdd(respondents[0].id, selectedEmployee.value);
    } else {
      // Добавляем строку (Эксперта).
      // Создаем связь с ПЕРВЫМ доступным кандидатом.
      if (subjects.length === 0) {
        toast.error('Сначала добавьте хотя бы одного кандидата (столбец)');
        return;
      }
      onAdd(selectedEmployee.value, subjects[0].id);
    }

    setAddingMode(null);
    setSelectedEmployee(null);
  };

  const handleCancelAdd = () => {
    setAddingMode(null);
    setSelectedEmployee(null);
  };

  // Удаление всей строки или столбца
  const handleRemoveEntity = (type: 'row' | 'col', id: number, name: string) => {
    if (!confirm(`Удалить ${type === 'row' ? 'эксперта' : 'кандидата'} "${name}" и все его связи?`)) return;
    
    data.forEach(item => {
      if ((type === 'row' && item.evaluatorId === id) || 
          (type === 'col' && item.targetId === id)) {
        onDelete(item.id, item.evaluatorName, item.targetName);
      }
    });
  };

  // Рендер ячейки добавления (Select + кнопки)
  const renderAddCell = (options: EmployeeOption[]) => (
    <div className="flex flex-col gap-2 min-w-[180px] p-2 bg-gray-50 dark:bg-gray-800 rounded border border-dashed border-gray-300 dark:border-gray-600 animate-fadeIn">
      <Select
        options={options}
        value={selectedEmployee}
        onChange={(opt) => setSelectedEmployee(opt)}
        placeholder="Выберите..."
        styles={{
          ...reactSelectStyles,
          control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' }),
        }}
        menuPortalTarget={document.body}
        autoFocus
        openMenuOnFocus
      />
      <div className="flex gap-1">
        <button 
          onClick={handleConfirmAdd} 
          disabled={!selectedEmployee || isMutating}
          className="flex-1 text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 disabled:opacity-50"
        >
          {isMutating ? '...' : 'OK'}
        </button>
        <button 
          onClick={handleCancelAdd} 
          className="flex-1 text-xs bg-gray-300 text-gray-700 rounded px-2 py-1 hover:bg-gray-400"
        >
          ✕
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fadeInUp space-y-4">
      {/* Статистика */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md text-sm font-medium border border-blue-100 dark:border-blue-800">
        <span>Результаты:</span>
        <span className="font-bold">{stats.evaluated}</span>
        <span>из</span>
        <span>{stats.total}</span>
        <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded-full text-xs">
          {stats.percentage}%
        </span>
      </div>

      {/* Таблица Матрицы */}
      {subjects.length === 0 && respondents.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
          <p className="text-lg mb-2 font-medium">Матрица пуста</p>
          <p className="text-sm max-w-md mx-auto">
            Нажмите на <span className="text-directum-orange font-bold">+</span> справа от заголовков или снизу, чтобы добавить первых участников.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                {/* Угловая ячейка */}
                <th className="sticky left-0 z-20 bg-gray-800 p-3 border-r border-gray-600 text-left min-w-[180px] text-xs uppercase tracking-wider opacity-80">
                  Эксперт ↓ \ Кандидат →
                </th>
                
                {/* Столбцы кандидатов */}
                {subjects.map(sub => (
                  <th key={sub.id} className="p-3 border-r border-gray-600 relative group min-w-[140px]">
                    <div className="pr-6 truncate font-medium text-sm" title={sub.name}>{sub.name}</div>
                    {isDraft && (
                      <button
                        onClick={() => handleRemoveEntity('col', sub.id, sub.name)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all p-1 rounded hover:bg-red-500/10"
                        title="Удалить столбец"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </th>
                ))}

                {/* Кнопка добавления столбца (+) */}
                {isDraft && (
                  <th className="p-2 border-l border-gray-600 w-12 text-center bg-gray-800/50">
                    {!addingMode ? (
                      <button 
                        onClick={() => setAddingMode({ type: 'col' })}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-directum-orange/20 text-directum-orange hover:bg-directum-orange hover:text-white transition-all mx-auto"
                        title="Добавить кандидата"
                      >
                        <Plus size={18} />
                      </button>
                    ) : addingMode.type === 'col' ? (
                      renderAddCell(availableSubjects)
                    ) : null}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {respondents.map((resp, idx) => (
                <tr key={resp.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                  {/* Заголовок строки (Эксперт) */}
                  <td className="sticky left-0 z-10 bg-inherit p-3 border-r border-b border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200 group text-sm">
                    <div className="pr-6 truncate" title={resp.name}>{resp.name}</div>
                     {isDraft && (
                      <button
                        onClick={() => handleRemoveEntity('row', resp.id, resp.name)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded hover:bg-red-500/10"
                        title="Удалить строку"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </td>

                  {/* Ячейки пересечения */}
                  {subjects.map(sub => {
                    const key = `${resp.id}_${sub.id}`;
                    const item = matrixMap.get(key);
                    const isEvaluated = item?.completed === true;
                    const hasLink = !!item;

                    return (
                      <td 
                        key={key} 
                        className={`border-r border-b border-gray-200 dark:border-gray-700 text-center align-middle transition-colors relative ${
                          isEvaluated 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : hasLink 
                              ? 'bg-yellow-50 dark:bg-yellow-900/10' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full w-full py-3 gap-1">
                          {/* Индикатор статуса */}
                          <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${
                            isEvaluated 
                              ? 'bg-green-600 border-green-600 text-white shadow-sm' 
                              : hasLink
                                ? 'border-yellow-400 bg-white dark:bg-gray-800'
                                : 'border-transparent'
                          }`}>
                            {isEvaluated && <Check size={14} strokeWidth={3} />}
                            {hasLink && !isEvaluated && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                          </div>
                          
                          {/* Текст статуса */}
                          <span className={`text-[10px] font-medium ${
                            isEvaluated ? 'text-green-700 dark:text-green-400' : hasLink ? 'text-yellow-600 dark:text-yellow-500' : 'text-transparent'
                          }`}>
                            {isEvaluated ? 'Оценил' : hasLink ? 'Ожидает' : ''}
                          </span>

                          {/* Действия при наведении (если есть связь) */}
                          {hasLink && (
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/5 dark:bg-black/20 opacity-0 hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                              {!isEvaluated && (
                                <button
                                  onClick={() => onCopyLink(item!.token)}
                                  className="p-1.5 bg-white dark:bg-gray-800 rounded-full text-directum-orange shadow-sm hover:scale-110 transition-transform"
                                  title="Копировать ссылку"
                                >
                                  <LinkIcon size={12} />
                                </button>
                              )}
                              {isDraft && !isEvaluated && (
                                <button
                                  onClick={() => onDelete(item!.id, item!.evaluatorName, item!.targetName)}
                                  className="p-1.5 bg-white dark:bg-gray-800 rounded-full text-red-500 shadow-sm hover:scale-110 transition-transform"
                                  title="Удалить связь"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Кнопка добавления строки (+) */}
                  {isDraft && (
                    <td className="border-b border-gray-200 dark:border-gray-700 p-2 text-center bg-gray-50/50 dark:bg-gray-800/30">
                       {!addingMode ? (
                        <button 
                          onClick={() => setAddingMode({ type: 'row', id: resp.id })}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-directum-orange hover:bg-directum-orange/10 transition-all mx-auto opacity-50 hover:opacity-100"
                          title="Добавить кандидата для этого эксперта"
                        >
                          <Plus size={16} />
                        </button>
                      ) : addingMode.type === 'row' && addingMode.id === resp.id ? (
                        <div className="min-w-[160px]">
                           <Select
                            options={employees.filter(e => !subjects.some(s => s.id === e.value) && e.value !== resp.id)}
                            value={selectedEmployee}
                            onChange={(opt) => setSelectedEmployee(opt)}
                            placeholder="Кого добавить?"
                            styles={{
                              ...reactSelectStyles,
                              control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' }),
                            }}
                            menuPortalTarget={document.body}
                            autoFocus
                            openMenuOnFocus
                          />
                          <div className="flex gap-1 mt-1 justify-center">
                             <button 
                              onClick={handleConfirmAdd} 
                              disabled={!selectedEmployee || isMutating}
                              className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 disabled:opacity-50"
                            >
                              OK
                            </button>
                            <button onClick={handleCancelAdd} className="text-xs bg-gray-300 text-gray-700 rounded px-2 py-1 hover:bg-gray-400">✕</button>
                          </div>
                        </div>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))}

              {/* Строка добавления нового эксперта (внизу) */}
              {isDraft && (
                <tr>
                  <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 p-2 border-t border-r border-gray-200 dark:border-gray-700">
                     {!addingMode ? (
                      <button 
                        onClick={() => setAddingMode({ type: 'row' })}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-directum-orange transition-colors border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-directum-orange/50 hover:bg-directum-orange/5"
                      >
                        <Plus size={16} />
                        <span>Добавить эксперта</span>
                      </button>
                     ) : addingMode.type === 'row' && !addingMode.id ? (
                        renderAddCell(availableRespondents)
                     ) : null}
                  </td>
                  {/* Пустые ячейки под столбцами */}
                  {subjects.map(sub => (
                    <td key={`empty-${sub.id}`} className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30"></td>
                  ))}
                  {isDraft && <td className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30"></td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isDraft && (
        <div className="text-xs text-gray-500 italic text-right mt-2">
          * Режим просмотра. Изменения доступны только в статусе «Черновик».
        </div>
      )}
    </div>
  );
};