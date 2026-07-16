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

// Утилита для разбивки ФИО на 3 строки
const formatNameToLines = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 3) {
    return (
      <>
        <div>{parts[0]}</div>
        <div>{parts[1]}</div>
        <div>{parts.slice(2).join(' ')}</div>
      </>
    );
  }
  // Если слов меньше 3, просто выводим как есть, но с переносом
  return <div className="leading-tight">{fullName}</div>;
};

export const SurveyMatrix: React.FC<SurveyMatrixProps> = ({
  data,
  employees,
  isDraft,
  onAdd,
  onDelete,
  onCopyLink,
  isMutating,
}) => {
  const [addingMode, setAddingMode] = useState<{ type: 'col' | 'row' } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  const { subjects, respondents, matrixMap } = useMemo(() => {
    const subjectSet = new Map<number, string>();
    const respondentSet = new Map<number, string>();
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

  const stats = useMemo(() => {
    const total = subjects.length * respondents.length;
    const evaluated = Array.from(matrixMap.values()).filter(i => i.completed).length;
    const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    return { total, evaluated, percentage };
  }, [subjects, respondents, matrixMap]);

  const availableSubjects = employees.filter(e => !subjects.some(s => s.id === e.value));
  const availableRespondents = employees.filter(e => !respondents.some(r => r.id === e.value));

  const handleConfirmAdd = () => {
    if (!selectedEmployee || !addingMode) return;

    if (addingMode.type === 'col') {
      if (respondents.length === 0) {
        toast.error('Сначала добавьте хотя бы одного эксперта');
        return;
      }
      onAdd(respondents[0].id, selectedEmployee.value);
    } else {
      if (subjects.length === 0) {
        toast.error('Сначала добавьте хотя бы одного кандидата');
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

  const handleRemoveEntity = (type: 'row' | 'col', id: number, name: string) => {
    if (!confirm(`Удалить ${type === 'row' ? 'эксперта' : 'кандидата'} "${name}" и все его связи?`)) return;
    
    data.forEach(item => {
      if ((type === 'row' && item.evaluatorId === id) || 
          (type === 'col' && item.targetId === id)) {
        onDelete(item.id, item.evaluatorName, item.targetName);
      }
    });
  };

  const handleCellClick = (respId: number, subId: number) => {
    if (!isDraft) return;
    const key = `${respId}_${subId}`;
    const item = matrixMap.get(key);

    if (item) {
      if (item.completed) {
        toast.error('Нельзя удалить завершенную оценку');
        return;
      }
      onDelete(item.id, item.evaluatorName, item.targetName);
    } else {
      onAdd(respId, subId);
    }
  };

  const renderAddForm = (options: EmployeeOption[]) => (
    <div className="flex flex-col gap-1 min-w-[140px] p-1.5 bg-white dark:bg-gray-800 rounded border border-dashed border-directum-orange/50 shadow-lg animate-fadeIn z-50">
      <Select
        options={options}
        value={selectedEmployee}
        onChange={(opt) => setSelectedEmployee(opt)}
        placeholder="Выберите..."
        styles={{
          ...reactSelectStyles,
          control: (base) => ({ ...base, minHeight: '26px', fontSize: '11px' }),
          menuPortalTarget: document.body,
        }}
        menuPortalTarget={document.body}
        autoFocus
        openMenuOnFocus
      />
      <div className="flex gap-1 mt-1">
        <button 
          onClick={handleConfirmAdd} 
          disabled={!selectedEmployee || isMutating}
          className="flex-1 text-[10px] bg-green-600 text-white rounded px-1 py-0.5 hover:bg-green-700 disabled:opacity-50"
        >
          {isMutating ? '...' : 'OK'}
        </button>
        <button 
          onClick={handleCancelAdd} 
          className="flex-1 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-1 py-0.5 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fadeInUp space-y-2">
      {/* Статистика */}
      <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-xs font-medium border border-blue-100 dark:border-blue-800">
        <span>📈</span>
        <span>{stats.evaluated}/{stats.total}</span>
        <span className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded-full text-[10px]">
          {stats.percentage}%
        </span>
      </div>

      {/* Таблица Матрицы */}
      {subjects.length === 0 && respondents.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
          <p className="text-sm mb-1 font-medium">Матрица пуста</p>
          <p className="text-xs max-w-md mx-auto">
            Нажмите <span className="text-directum-orange font-bold">+</span> чтобы добавить участников
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
          <table className="w-full border-collapse min-w-[400px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                {/* Угловая ячейка */}
                <th className="sticky left-0 z-20 bg-gray-800 p-1.5 border-r border-gray-600 text-left min-w-[100px] text-[10px] uppercase tracking-wider opacity-80 leading-tight">
                  Эксперт ↓<br/>Кандидат →
                </th>
                
                {/* Столбцы кандидатов */}
                {subjects.map(sub => (
                  <th key={sub.id} className="p-1.5 border-r border-gray-600 relative group min-w-[60px] align-top">
                    <div className="pr-4 truncate font-medium text-[12px] leading-tight text-center" title={sub.name}>
                      {formatNameToLines(sub.name)}
                    </div>
                    {isDraft && (
                      <button
                        onClick={() => handleRemoveEntity('col', sub.id, sub.name)}
                        className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all p-0.5 rounded hover:bg-red-500/10"
                        title="Удалить столбец"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </th>
                ))}

                {/* Кнопка добавления столбца (+) */}
                {isDraft && (
                  <th className="p-1 border-l border-gray-600 w-8 text-center bg-gray-800/50 align-middle relative">
                    {!addingMode ? (
                      <button 
                        onClick={() => setAddingMode({ type: 'col' })}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-directum-orange/20 text-directum-orange hover:bg-directum-orange hover:text-white transition-all mx-auto"
                        title="Добавить кандидата"
                      >
                        <Plus size={14} />
                      </button>
                    ) : addingMode.type === 'col' ? (
                      <div className="absolute right-0 top-full mt-1 z-50">
                        {renderAddForm(availableSubjects)}
                      </div>
                    ) : null}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {respondents.map((resp, idx) => (
                <tr key={resp.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                  {/* Заголовок строки (Эксперт) */}
                  <td className="sticky left-0 z-10 bg-inherit p-1.5 border-r border-b border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200 text-[12px] leading-tight align-top">
                    <div className="truncate pr-2" title={resp.name}>
                      {formatNameToLines(resp.name)}
                    </div>
                  </td>

                  {/* Ячейки пересечения - МАКСИМАЛЬНО КОМПАКТНЫЕ */}
                  {subjects.map(sub => {
                    const key = `${resp.id}_${sub.id}`;
                    const item = matrixMap.get(key);
                    const isEvaluated = item?.completed === true;
                    const hasLink = !!item;

                    return (
                      <td 
                        key={key} 
                        className={`border-r border-b border-gray-200 dark:border-gray-700 text-center align-middle transition-colors relative cursor-pointer select-none h-9 ${
                          isEvaluated 
                            ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' 
                            : hasLink 
                              ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleCellClick(resp.id, sub.id)}
                        title={isDraft ? (hasLink ? 'Нажмите, чтобы удалить связь' : 'Нажмите, чтобы создать связь') : ''}
                      >
                        <div className="flex items-center justify-center h-full w-full pointer-events-none">
                          {/* Визуальный индикатор (квадрат) */}
                          <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                            isEvaluated 
                              ? 'bg-green-600 border-green-600 text-white shadow-sm' 
                              : hasLink
                                ? 'border-yellow-400 bg-white dark:bg-gray-800'
                                : 'border-transparent'
                          }`}>
                            {isEvaluated && <Check size={9} strokeWidth={3} />}
                            {hasLink && !isEvaluated && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                          </div>
                        </div>

                        {/* Действия при наведении */}
                        {hasLink && !isEvaluated && isDraft && (
                          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/5 dark:bg-black/20 opacity-0 hover:opacity-100 transition-opacity backdrop-blur-[1px] pointer-events-auto">
                            <button
                              onClick={(e) => { e.stopPropagation(); onCopyLink(item!.token); }}
                              className="p-0.5 bg-white dark:bg-gray-800 rounded-full text-directum-orange shadow-sm hover:scale-110 transition-transform"
                              title="Копировать ссылку"
                            >
                              <LinkIcon size={9} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(item!.id, item!.evaluatorName, item!.targetName); }}
                              className="p-0.5 bg-white dark:bg-gray-800 rounded-full text-red-500 shadow-sm hover:scale-110 transition-transform"
                              title="Удалить связь"
                            >
                              <Trash2 size={9} />
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  
                  {/* Пустая ячейка под кнопкой "+" */}
                  {isDraft && <td className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30 h-9"></td>}
                </tr>
              ))}

              {/* Строка добавления нового эксперта (внизу) */}
              {isDraft && (
                <tr>
                  <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 p-1 border-t border-r border-gray-200 dark:border-gray-700 relative">
                     {!addingMode ? (
                      <button 
                        onClick={() => setAddingMode({ type: 'row' })}
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-gray-500 hover:text-directum-orange transition-colors border border-dashed border-gray-300 dark:border-gray-700 rounded hover:border-directum-orange/50 hover:bg-directum-orange/5"
                      >
                        <Plus size={12} />
                        <span>Добавить эксперта</span>
                      </button>
                     ) : addingMode.type === 'row' ? (
                        <div className="absolute left-0 bottom-full mb-1 z-50 w-full">
                          {renderAddForm(availableRespondents)}
                        </div>
                     ) : null}
                  </td>
                  {/* Пустые ячейки под столбцами */}
                  {subjects.map(sub => (
                    <td key={`empty-${sub.id}`} className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30 h-9"></td>
                  ))}
                  {isDraft && <td className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30 h-9"></td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isDraft && (
        <div className="text-[10px] text-gray-500 italic text-right mt-1">
          * Режим просмотра. Изменения доступны только в статусе «Черновик».
        </div>
      )}
    </div>
  );
};