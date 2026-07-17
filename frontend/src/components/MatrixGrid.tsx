import React, { useMemo, useState } from 'react';
import { Plus, X, Check, Link as LinkIcon, Trash2, Users2, Boxes } from 'lucide-react';
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
  deleteMutation: { mutateAsync: (id: number) => Promise<unknown> };
  /**
   * 'live' — реальная матрица опроса: ссылки на прохождение, статус «оценено/не оценено».
   * 'template' — состав шаблона респондентов: ячейка значит «этот респондент входит в
   * состав для этого оцениваемого», без ссылок и статусов прохождения. Если isDraft=true —
   * ячейки кликабельны (добавляют/убирают связь), иначе это просто просмотр.
   */
  variant?: 'live' | 'template';
  /** Подписи осей */
  rowLabel?: string;
  colLabel?: string;
}

// Утилита для разбивки ФИО на короткие строки
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
  deleteMutation,
  variant = 'live',
  rowLabel = 'Оценивает',
  colLabel = 'Оценивают',
}) => {
  const isTemplate = variant === 'template';
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
    const evaluated = Array.from(matrixMap.values()).filter((i) => i.completed).length;
    const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    return { total, evaluated, percentage, configured: matrixMap.size };
  }, [subjects, respondents, matrixMap]);

  const availableSubjects = employees.filter((e) => !subjects.some((s) => s.id === e.value));
  const availableRespondents = employees.filter((e) => !respondents.some((r) => r.id === e.value));

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

  const handleRemoveEntity = async (type: 'row' | 'col', id: number, name: string) => {
    if (!confirm(`Удалить ${type === 'row' ? 'эксперта' : 'кандидата'} "${name}" и все его связи?`)) return;

    const itemsToRemove = data.filter(
      (item) => (type === 'row' && item.evaluatorId === id) || (type === 'col' && item.targetId === id),
    );

    for (const item of itemsToRemove) {
      try {
        await deleteMutation.mutateAsync(item.id);
      } catch (error) {
        console.error(`Ошибка при удалении связи ${item.id}:`, error);
        toast.error('Не удалось удалить часть связей');
        break;
      }
    }

    // если удаляем последнюю строку/столбец, а «голых» противоположных сущностей не осталось —
    // ничего дополнительно делать не нужно, компонент сам перерисуется по новым data
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
    <div className="animate-fadeIn z-50 flex min-w-[180px] flex-col gap-2 rounded-lg border border-dashed border-directum-orange/50 bg-white p-2 shadow-lg dark:bg-gray-800">
      <Select
        options={options}
        value={selectedEmployee}
        onChange={(opt) => setSelectedEmployee(opt)}
        placeholder="Выберите..."
        styles={{
          ...reactSelectStyles,
          control: (base) => ({ ...base, minHeight: '32px', fontSize: '13px' }),
          menuPortalTarget: document.body,
        }}
        menuPortalTarget={document.body}
        autoFocus
        openMenuOnFocus
      />
      <div className="mt-0.5 flex gap-1.5">
        <button
          onClick={handleConfirmAdd}
          disabled={!selectedEmployee || isMutating}
          className="flex-1 rounded-md bg-directum-orange px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-directum-orange/90 disabled:opacity-50"
        >
          {isMutating ? '...' : 'Добавить'}
        </button>
        <button
          onClick={handleCancelAdd}
          className="flex-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Отмена
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fadeInUp space-y-3">
      {/* Статистика */}
      {isTemplate ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-directum-orange/20 bg-directum-orange/10 px-3 py-1.5 text-xs font-medium text-directum-orange">
          <Boxes size={14} />
          <span>
            {respondents.length} {respondents.length === 1 ? 'респондент' : 'респондентов'} ×{' '}
            {subjects.length} {subjects.length === 1 ? 'оцениваемый' : 'оцениваемых'}
          </span>
          <span className="rounded-full bg-directum-orange/20 px-2 py-0.5 text-[11px]">
            {stats.configured} {stats.configured === 1 ? 'связь' : 'связей'}
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          <span>Пройдено</span>
          <span>
            {stats.evaluated}/{stats.total}
          </span>
          <span className="rounded-full bg-blue-200 px-2 py-0.5 text-[11px] dark:bg-blue-800">
            {stats.percentage}%
          </span>
        </div>
      )}

      {/* Таблица Матрицы */}
      
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr className="bg-directum-dark text-white">
                {/* Угловая ячейка */}
                <th className="sticky left-0 z-20 min-w-[140px] border-r border-white/10 bg-directum-dark p-3 text-left text-[11px] font-semibold uppercase leading-tight tracking-wide opacity-90">
                  {rowLabel}
                  <br />↓ &nbsp;/&nbsp; {colLabel} →
                </th>

                {/* Столбцы кандидатов */}
                {subjects.map((sub) => (
                  <th key={sub.id} className="group relative min-w-[92px] border-r border-white/10 p-2 align-top">
                    <div className="truncate pr-4 text-center text-[13px] font-medium leading-tight" title={sub.name}>
                      {formatNameToLines(sub.name)}
                    </div>
                    {isDraft && (
                      <button
                        onClick={() => handleRemoveEntity('col', sub.id, sub.name)}
                        className="absolute right-1 top-1 rounded p-0.5 text-white/50 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
                        title="Удалить столбец"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </th>
                ))}

                {/* Кнопка добавления столбца (+) */}
                {isDraft && (
                  <th className="relative w-10 border-l border-white/10 bg-white/5 p-1 text-center align-middle">
                    {!addingMode ? (
                      <button
                        onClick={() => setAddingMode({ type: 'col' })}
                        className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-directum-orange/25 text-directum-orange transition-all hover:bg-directum-orange hover:text-white"
                        title="Добавить кандидата"
                      >
                        <Plus size={16} />
                      </button>
                    ) : addingMode.type === 'col' ? (
                      <div className="absolute right-0 top-full z-50 mt-1">{renderAddForm(availableSubjects)}</div>
                    ) : null}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {respondents.map((resp, idx) => (
                <tr key={resp.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/70 dark:bg-gray-800/40'}>
                  {/* Заголовок строки (Эксперт) */}
                  <td className="sticky left-0 z-10 min-w-[140px] border-b border-r border-gray-200 bg-inherit p-3 align-top text-[13px] font-semibold leading-tight text-gray-800 dark:border-gray-700 dark:text-gray-200">
                    <div className="group relative flex items-start justify-between gap-1">
                      <div className="truncate pr-2" title={resp.name}>
                        {formatNameToLines(resp.name)}
                      </div>
                      {isDraft && (
                        <button
                          onClick={() => handleRemoveEntity('row', resp.id, resp.name)}
                          className="mt-0.5 shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-all hover:bg-red-100 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/30"
                          title="Удалить строку"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Ячейки пересечения */}
                  {subjects.map((sub) => {
                    const key = `${resp.id}_${sub.id}`;
                    const item = matrixMap.get(key);
                    const isEvaluated = item?.completed === true;
                    const hasLink = !!item;

                    return (
                      <td
                        key={key}
                        className={`relative h-12 border-b border-r border-gray-200 text-center align-middle transition-colors dark:border-gray-700 ${
                          isDraft ? 'cursor-pointer select-none' : ''
                        } ${
                          isTemplate
                            ? hasLink
                              ? 'bg-directum-orange/10 hover:bg-directum-orange/20 dark:bg-directum-orange/[0.12]'
                              : isDraft
                                ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                : ''
                            : isEvaluated
                              ? 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                              : hasLink
                                ? 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleCellClick(resp.id, sub.id)}
                        title={isDraft ? (hasLink ? 'Нажмите, чтобы удалить связь' : 'Нажмите, чтобы создать связь') : ''}
                      >
                        <div className="pointer-events-none flex h-full w-full items-center justify-center">
                          {isTemplate ? (
                            hasLink && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-directum-orange text-white shadow-sm">
                                <Check size={13} strokeWidth={3} />
                              </div>
                            )
                          ) : (
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                                isEvaluated
                                  ? 'border-green-600 bg-green-600 text-white shadow-sm'
                                  : hasLink
                                    ? 'border-yellow-400 bg-white dark:bg-gray-800'
                                    : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              {isEvaluated && <Check size={12} strokeWidth={3} />}
                              {hasLink && !isEvaluated && <div className="h-2 w-2 rounded-full bg-yellow-400" />}
                            </div>
                          )}
                        </div>

                        {/* Действия при наведении — только для реальной матрицы опроса (ссылка) */}
                        {!isTemplate && hasLink && !isEvaluated && isDraft && (
                          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center gap-1.5 bg-black/5 opacity-0 backdrop-blur-[1px] transition-opacity hover:opacity-100 dark:bg-black/20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopyLink(item!.token);
                              }}
                              className="rounded-full bg-white p-1 text-directum-orange shadow-sm transition-transform hover:scale-110 dark:bg-gray-800"
                              title="Копировать ссылку"
                            >
                              <LinkIcon size={11} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item!.id, item!.evaluatorName, item!.targetName);
                              }}
                              className="rounded-full bg-white p-1 text-red-500 shadow-sm transition-transform hover:scale-110 dark:bg-gray-800"
                              title="Удалить связь"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {isDraft && <td className="h-12 border-b border-gray-200 bg-gray-50/30 dark:border-gray-700 dark:bg-gray-800/30" />}
                </tr>
              ))}

              {/* Строка добавления нового эксперта (внизу) */}
              {isDraft && (
                <tr>
                  <td className="sticky left-0 z-10 border-r border-t border-gray-200 bg-gray-50 p-1.5 dark:border-gray-700 dark:bg-gray-900">
                    {!addingMode ? (
                      <button
                        onClick={() => setAddingMode({ type: 'row' })}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 transition-colors hover:border-directum-orange/50 hover:bg-directum-orange/5 hover:text-directum-orange dark:border-gray-700"
                      >
                        <Plus size={14} />
                        <span>{isTemplate ? 'Добавить респондента' : 'Добавить эксперта'}</span>
                      </button>
                    ) : addingMode.type === 'row' ? (
                      <div className="absolute bottom-full left-0 z-50 mb-1 w-full">{renderAddForm(availableRespondents)}</div>
                    ) : null}
                  </td>
                  {subjects.map((sub) => (
                    <td key={`empty-${sub.id}`} className="h-12 border-t border-gray-200 bg-gray-50/30 dark:border-gray-700 dark:bg-gray-800/30" />
                  ))}
                  {isDraft && <td className="h-12 border-t border-gray-200 bg-gray-50/30 dark:border-gray-700 dark:bg-gray-800/30" />}
                </tr>
              )}
            </tbody>
          </table>
        </div>

      {!isTemplate && !isDraft && (
        <div className="mt-1 text-right text-[11px] italic text-gray-500">
          * Режим просмотра. Изменения доступны только в статусе «Черновик».
        </div>
      )}
    </div>
  );
};