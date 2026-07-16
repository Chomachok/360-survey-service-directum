import React, { useMemo } from 'react';
import { Check, X, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Типы из твоего API
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
  isMutating: boolean;
}

export const SurveyMatrix: React.FC<SurveyMatrixProps> = ({
  data,
  employees,
  isDraft,
  onAdd,
  onDelete,
  isMutating,
}) => {
  // Трансформируем плоский список в структуру для матрицы
  const { subjects, respondents, answersMap } = useMemo(() => {
    const subjectSet = new Map<number, string>(); // Target = Subject (кого оценивают)
    const respondentSet = new Map<number, string>(); // Evaluator = Respondent (кто оценивает)
    const map = new Map<string, MatrixItem>();

    data.forEach((item) => {
      subjectSet.set(item.targetId, item.targetName);
      respondentSet.set(item.evaluatorId, item.evaluatorName);
      map.set(`${item.evaluatorId}_${item.targetId}`, item);
    });

    return {
      subjects: Array.from(subjectSet.entries()).map(([id, name]) => ({ id, name })),
      respondents: Array.from(respondentSet.entries()).map(([id, name]) => ({ id, name })),
      answersMap: map,
    };
  }, [data]);

  // Статистика
  const stats = useMemo(() => {
    const total = subjects.length * respondents.length;
    const evaluated = Array.from(answersMap.values()).filter(i => i.completed).length;
    const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    return { total, evaluated, percentage };
  }, [subjects, respondents, answersMap]);

  // Доступные сотрудники для добавления (исключаем уже добавленных)
  const availableSubjects = employees.filter(
    e => !subjects.some(s => s.id === e.value)
  );
  const availableRespondents = employees.filter(
    e => !respondents.some(r => r.id === e.value)
  );

  const handleAddSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const select = form.elements.namedItem('newSubject') as HTMLSelectElement;
    const targetId = Number(select.value);
    
    if (!targetId) return toast.error('Выберите кандидата');
    
    // При добавлении столбца создаем связи со ВСЕМИ текущими респондентами
    // Или можно создать только одну связь, если бизнес-логика требует ручного выбора.
    // Здесь реализуем добавление "пустого" столбца через создание связи с первым доступным респондентом
    // или просто добавляем сотрудника в список (если бэк позволяет).
    // Для совместимости с текущим API addMatrixItem(evaluatorId, targetId):
    if (respondents.length === 0) {
      toast.error('Сначала добавьте хотя бы одного эксперта');
      return;
    }
    // Создаем связь с первым респондентом, чтобы столбец появился
    onAdd(respondents[0].id, targetId);
    form.reset();
  };

  const handleAddRespondent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const select = form.elements.namedItem('newRespondent') as HTMLSelectElement;
    const evaluatorId = Number(select.value);
    
    if (!evaluatorId) return toast.error('Выберите эксперта');
    
    if (subjects.length === 0) {
      toast.error('Сначала добавьте хотя бы одного кандидата');
      return;
    }
    // Создаем связь с первым кандидатом, чтобы строка появилась
    onAdd(evaluatorId, subjects[0].id);
    form.reset();
  };

  const handleToggle = (respId: number, subId: number, currentCompleted: boolean) => {
    if (!isDraft) return;
    
    // В оригинальном коде был чекбокс. В твоем API есть только delete/add.
    // Если completed=true -> удаляем связь (или оставляем, если нельзя удалять завершенные)
    // Если completed=false -> это значит связь есть, но не завершена. 
    // Чекбокс в данном случае работает как "Отметить выполненным вручную", 
    // но так как у тебя нет API для смены статуса, используем удаление как "снять отметку"
    // ТОЛЬКО если связь еще не завершена реально.
    
    const key = `${respId}_${subId}`;
    const item = answersMap.get(key);
    
    if (item) {
      if (item.completed) {
        toast.error('Нельзя снять отметку с завершенной оценки');
        return;
      }
      onDelete(item.id, item.evaluatorName, item.targetName);
    } else {
      // Связи нет -> создаем
      onAdd(respId, subId);
    }
  };

  return (
    <div className="animate-fadeInUp space-y-4">
      {/* Панель управления */}
      {isDraft && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-wrap gap-6 items-end">
          {/* Добавление кандидата (столбец) */}
          <form onSubmit={handleAddSubject} className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              👤 Добавить кандидата (столбец)
            </label>
            <div className="flex gap-2">
              <select
                name="newSubject"
                className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-directum-orange focus:border-transparent outline-none"
                disabled={isMutating || availableSubjects.length === 0}
              >
                <option value="">Выберите сотрудника...</option>
                {availableSubjects.map(emp => (
                  <option key={emp.value} value={emp.value}>{emp.label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isMutating || availableSubjects.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Plus size={16} />
                {isMutating ? '...' : 'Добавить'}
              </button>
            </div>
            {availableSubjects.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Все сотрудники уже добавлены</p>
            )}
          </form>

          {/* Добавление эксперта (строка) */}
          <form onSubmit={handleAddRespondent} className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              🎯 Добавить эксперта (строку)
            </label>
            <div className="flex gap-2">
              <select
                name="newRespondent"
                className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-directum-orange focus:border-transparent outline-none"
                disabled={isMutating || availableRespondents.length === 0}
              >
                <option value="">Выберите сотрудника...</option>
                {availableRespondents.map(emp => (
                  <option key={emp.value} value={emp.value}>{emp.label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isMutating || availableRespondents.length === 0}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Plus size={16} />
                {isMutating ? '...' : 'Добавить'}
              </button>
            </div>
             {availableRespondents.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Все сотрудники уже добавлены</p>
            )}
          </form>
        </div>
      )}

      {/* Статистика */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md text-sm font-medium border border-blue-100 dark:border-blue-800">
        <span>📈 Заполненность:</span>
        <span className="font-bold">{stats.evaluated}</span>
        <span>из</span>
        <span>{stats.total}</span>
        <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded-full text-xs">
          {stats.percentage}%
        </span>
      </div>

      {/* Таблица */}
      {subjects.length === 0 && respondents.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-lg mb-2">Матрица пуста</p>
          <p className="text-sm">Добавьте кандидатов или экспертов выше, чтобы начать</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="sticky left-0 z-20 bg-gray-800 p-3 border-r border-gray-600 text-left min-w-[180px]">
                  Эксперт ↓ \ Кандидат →
                </th>
                {subjects.map(sub => (
                  <th key={sub.id} className="p-3 border-r border-gray-600 relative group min-w-[140px]">
                    <div className="pr-6 truncate font-medium" title={sub.name}>{sub.name}</div>
                    {isDraft && (
                      <button
                        onClick={() => {
                          if(confirm(`Удалить кандидата "${sub.name}" и все его связи?`)) {
                            // Удаляем все связи этого субъекта
                            data.filter(d => d.targetId === sub.id).forEach(d => 
                              onDelete(d.id, d.evaluatorName, d.targetName)
                            );
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                        title="Удалить кандидата"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {respondents.map((resp, idx) => (
                <tr key={resp.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                  <td className="sticky left-0 z-10 bg-inherit p-3 border-r border-b border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200 group">
                    <div className="pr-6 truncate" title={resp.name}>{resp.name}</div>
                     {isDraft && (
                      <button
                        onClick={() => {
                           if(confirm(`Удалить эксперта "${resp.name}" и все его связи?`)) {
                            data.filter(d => d.evaluatorId === resp.id).forEach(d => 
                              onDelete(d.id, d.evaluatorName, d.targetName)
                            );
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                        title="Удалить эксперта"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </td>
                  {subjects.map(sub => {
                    const key = `${resp.id}_${sub.id}`;
                    const item = answersMap.get(key);
                    const isEvaluated = item?.completed === true;
                    const hasLink = !!item;

                    return (
                      <td 
                        key={key} 
                        className={`border-r border-b border-gray-200 dark:border-gray-700 text-center align-middle transition-colors ${
                          isEvaluated 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : hasLink 
                              ? 'bg-yellow-50 dark:bg-yellow-900/10' 
                              : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <label className="flex flex-col items-center justify-center h-full w-full py-3 cursor-pointer select-none gap-1">
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            isEvaluated 
                              ? 'bg-green-600 border-green-600 text-white' 
                              : hasLink
                                ? 'border-yellow-400 bg-white'
                                : 'border-gray-300 bg-white'
                          }`}>
                            {isEvaluated && <Check size={14} strokeWidth={3} />}
                            {hasLink && !isEvaluated && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                          </div>
                          
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isEvaluated}
                            onChange={() => handleToggle(resp.id, sub.id, isEvaluated)}
                            disabled={!isDraft || (hasLink && isEvaluated)}
                          />
                          
                          <span className={`text-[10px] font-medium ${
                            isEvaluated ? 'text-green-700 dark:text-green-400' : 'text-gray-400'
                          }`}>
                            {isEvaluated ? '✓ Оценил' : hasLink ? '○ Ожидает' : '— Нет связи'}
                          </span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isDraft && (
        <div className="text-xs text-gray-500 italic text-right">
          * Режим просмотра. Изменения доступны только в статусе «Черновик».
        </div>
      )}
    </div>
  );
};