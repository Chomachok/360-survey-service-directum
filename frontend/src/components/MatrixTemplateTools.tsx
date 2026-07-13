import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutTemplate, Save, Wand2, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getRespondentTemplates,
  applyRespondentTemplate,
  createTemplateFromSurvey,
} from '../api/respondentTemplates'
import type { MatrixItem } from '../types'

interface Props {
  surveyId: number
  isDraft: boolean
  matrix: MatrixItem[]
  employees: { id: number; fullName: string }[]
}

/**
 * Работа с предопределёнными списками респондентов прямо на странице матрицы:
 *  - применить готовый шаблон к выбранному оцениваемому (одним кликом вместо ручного набора);
 *  - сохранить уже набранный вручную состав как новый шаблон.
 */
export default function MatrixTemplateTools({ surveyId, isDraft, matrix, employees }: Props) {
  const queryClient = useQueryClient()

  const { data: templates } = useQuery({
    queryKey: ['respondent-templates'],
    queryFn: getRespondentTemplates,
  })

  const [templateId, setTemplateId] = useState<number | ''>('')
  const [targetId, setTargetId] = useState<number | ''>('')

  const [saveOpen, setSaveOpen] = useState(false)
  const [saveTargetId, setSaveTargetId] = useState<number | ''>('')
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')

  /** оцениваемые, которые уже есть в матрице — только их можно сохранить как шаблон */
  const targetsInMatrix = useMemo(() => {
    const map = new Map<number, string>()
    matrix.forEach((m) => map.set(m.targetId, m.targetName))
    return [...map.entries()].map(([id, fullName]) => ({ id, fullName }))
  }, [matrix])

  const selectedTemplate = templates?.find((t) => t.id === templateId)

  const applyMutation = useMutation({
    mutationFn: () =>
      applyRespondentTemplate(surveyId, {
        templateId: Number(templateId),
        targetId: Number(targetId),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      if (result.created === 0) {
        toast('Все связи из шаблона уже были в матрице', { icon: 'ℹ️' })
      } else {
        toast.success(
          `Добавлено связей: ${result.created}` +
            (result.skipped > 0 ? `, пропущено дублей: ${result.skipped}` : ''),
        )
      }
      setTemplateId('')
      setTargetId('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Не удалось применить шаблон')
    },
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      createTemplateFromSurvey({
        surveyId,
        targetId: Number(saveTargetId),
        name: saveName.trim(),
        description: saveDescription.trim() || undefined,
      }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['respondent-templates'] })
      toast.success(`Шаблон «${template.name}» сохранён`)
      setSaveOpen(false)
      setSaveName('')
      setSaveDescription('')
      setSaveTargetId('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Не удалось сохранить шаблон')
    },
  })

  return (
    <>
      <div className="animate-fadeInUp mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-directum-dark">
            <LayoutTemplate size={16} className="text-directum-orange" />
            Готовый список респондентов
          </h2>

          <div className="flex items-center gap-3">
            {targetsInMatrix.length > 0 && (
              <button
                onClick={() => {
                  setSaveTargetId(targetsInMatrix[0].id)
                  setSaveOpen(true)
                }}
                className="flex items-center gap-1 text-sm text-directum-orange hover:underline"
              >
                <Save size={14} />
                Сохранить текущий как шаблон
              </button>
            )}
            <Link
              to="/respondent-templates"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-directum-dark"
            >
              <ExternalLink size={14} />
              Управление шаблонами
            </Link>
          </div>
        </div>

        {!isDraft ? (
          <p className="text-sm text-gray-500">
            Применение шаблонов доступно только для опросов в статусе «Черновик».
          </p>
        ) : templates?.length === 0 ? (
          <p className="text-sm text-gray-500">
            Шаблонов пока нет.{' '}
            <Link to="/respondent-templates" className="text-directum-orange hover:underline">
              Создайте первый
            </Link>{' '}
            — и дальше состав оценивающих будет добавляться одним кликом.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Шаблон
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value === '' ? '' : Number(e.target.value))}
                className="input-field"
              >
                <option value="">Выберите шаблон</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.items.length})
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Кого оценивают
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value === '' ? '' : Number(e.target.value))}
                className="input-field"
              >
                <option value="">Выберите сотрудника</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => applyMutation.mutate()}
                disabled={!templateId || !targetId || applyMutation.isPending}
                className="btn-primary flex items-center space-x-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Wand2 size={18} />
                <span>{applyMutation.isPending ? 'Применяем...' : 'Применить'}</span>
              </button>
            </div>
          </div>
        )}

        {isDraft && selectedTemplate && (
          <p className="mt-3 text-xs text-gray-500">
            Будет добавлено {selectedTemplate.items.length} связ(и):{' '}
            {selectedTemplate.items.map((i) => i.employeeName).join(', ')}. Существующие дубли
            пропускаются.
          </p>
        )}
      </div>

      {/* ---------- сохранение текущего состава как шаблона ---------- */}
      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSaveOpen(false)} />

          <div className="animate-fadeInUp relative w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-directum-dark dark:text-white">
                Сохранить как шаблон
              </h3>
              <button
                onClick={() => setSaveOpen(false)}
                className="rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <p className="text-sm text-gray-500">
                В шаблон попадут все, кто оценивает выбранного сотрудника. Самооценка сохранится как
                «сам оцениваемый», поэтому шаблон останется применимым к любому другому человеку.
              </p>

              <div>
                <label className="label-field">Чей состав сохраняем</label>
                <select
                  value={saveTargetId}
                  onChange={(e) => setSaveTargetId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input-field"
                >
                  {targetsInMatrix.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-field">Название шаблона</label>
                <input
                  className="input-field"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Например: Отдел разработки, 360"
                />
              </div>

              <div>
                <label className="label-field">Описание (необязательно)</label>
                <input
                  className="input-field"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
              <button
                onClick={() => setSaveOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!saveName.trim() || !saveTargetId || saveMutation.isPending}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Сохранение...' : 'Сохранить шаблон'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
