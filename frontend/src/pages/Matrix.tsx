import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatrix, addMatrixItem, deleteMatrixItem } from '../api/matrix'
import { getEmployees } from '../api/employees'
import { getSurvey } from '../api/surveys'
import { getRespondentTemplates, applyRespondentTemplate } from '../api/respondentTemplates'
import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Link, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '../components/ConfirmModal'
import Select from 'react-select'
import { reactSelectStyles } from '../styles/reactSelectStyles'
import { SurveyMatrix } from '../components/MatrixGrid'
import LogoLoader from '../components/LogoLoader'

export default function Matrix() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const surveyId = parseInt(id!)
  const queryClient = useQueryClient()

  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => getSurvey(surveyId),
  })

  const { data: matrix, isLoading: mLoading } = useQuery({
    queryKey: ['matrix', surveyId],
    queryFn: () => getMatrix(surveyId),
  })
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  })
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['respondentTemplates'],
    queryFn: getRespondentTemplates,
  })

  // РЎРѕСЃС‚РѕСЏРЅРёСЏ
  const [evaluatorId, setEvaluatorId] = useState<number | ''>('')
  const [targetId, setTargetId] = useState<number | ''>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id?: number
    evaluatorName?: string
    targetName?: string
  }>({ isOpen: false })
  type FillMode = 'list' | 'matrix'
  const [fillMode, setFillMode] = useState<FillMode>('matrix')

  const isDraft = survey?.status === 'Draft'

  // РџСЂРё Р·Р°РіСЂСѓР·РєРµ РѕРїСЂРѕСЃР°, РµСЃР»Рё Сѓ РЅРµРіРѕ СѓР¶Рµ РµСЃС‚СЊ С†РµР»РµРІРѕР№ СЃРѕС‚СЂСѓРґРЅРёРє, СѓСЃС‚Р°РЅР°РІР»РёРІР°РµРј РµРіРѕ РІ РїРѕР»Рµ "РљРѕРіРѕ РѕС†РµРЅРёРІР°СЋС‚"
  useEffect(() => {
    if (survey?.targetId) {
      setTargetId(survey.targetId)
    }
  }, [survey])

  // РћРїС†РёРё РґР»СЏ react-select
  const evaluatorOptions = (employees || []).map(e => ({
    value: e.id,
    label: e.fullName,
  }))
  const targetOptions = (employees || []).map(e => ({
    value: e.id,
    label: e.fullName,
  }))
  const templateOptions = (templates || []).map(t => ({
    value: t.id,
    label: t.name,
  }))

  const selectedEvaluator = evaluatorId
    ? evaluatorOptions.find(opt => opt.value === evaluatorId)
    : null

  const selectedTarget = targetId
    ? targetOptions.find(opt => opt.value === targetId)
    : null

  const selectedTemplate = selectedTemplateId
    ? templateOptions.find(opt => opt.value === selectedTemplateId)
    : null

  const selectedTemplateObj = selectedTemplateId
    ? templates?.find(t => t.id === selectedTemplateId)
    : null

  // С€Р°Р±Р»РѕРЅ СЃ Р·Р°С€РёС‚С‹РјРё РѕС†РµРЅРёРІР°РµРјС‹РјРё РїСЂРёРјРµРЅСЏРµС‚СЃСЏ СЃСЂР°Р·Сѓ РєРѕ РІСЃРµРј РёРј, Р±РµР· СЂСѓС‡РЅРѕРіРѕ РІС‹Р±РѕСЂР°
  const templateHasOwnTargets = (selectedTemplateObj?.targets.length ?? 0) > 0

  // РќР°С…РѕРґРёРј РёРјСЏ С†РµР»РµРІРѕРіРѕ СЃРѕС‚СЂСѓРґРЅРёРєР° РґР»СЏ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ
  const addMutation = useMutation({
    mutationFn: (data: any) => addMatrixItem(surveyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      setEvaluatorId('')
      toast.success('РЎРІСЏР·СЊ РґРѕР±Р°РІР»РµРЅР° РІ РјР°С‚СЂРёС†Сѓ')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РґРѕР±Р°РІРёС‚СЊ СЃРІСЏР·СЊ'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) => deleteMatrixItem(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      setDeleteModal({ isOpen: false })
      toast.success('РЎРІСЏР·СЊ СѓРґР°Р»РµРЅР°')
    },
    onError: () => {
      toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ СЃРІСЏР·СЊ')
      setDeleteModal({ isOpen: false })
    },
  })

  const applyTemplateMutation = useMutation({
    mutationFn: (data: { templateId: number; targetIds?: number[] }) =>
      applyRespondentTemplate(surveyId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['matrix', surveyId] })
      setSelectedTemplateId(null)
      const message = 
        result.created === 0 && result.skipped > 0
          ? `Р’СЃРµ СЃРІСЏР·Рё СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓСЋС‚ (РїСЂРѕРїСѓС‰РµРЅРѕ ${result.skipped})`
          : result.skipped > 0
          ? `РЁР°Р±Р»РѕРЅ РїСЂРёРјРµРЅС‘РЅ: РґРѕР±Р°РІР»РµРЅРѕ ${result.created}, РїСЂРѕРїСѓС‰РµРЅРѕ (СѓР¶Рµ Р±С‹Р»Рѕ) ${result.skipped}`
          : `РЁР°Р±Р»РѕРЅ РјР°С‚СЂРёС†С‹ СѓСЃРїРµС€РЅРѕ РїСЂРёРјРµРЅС‘РЅ! Р”РѕР±Р°РІР»РµРЅРѕ ${result.created} СЃРІСЏР·РµР№`
      toast.success(message)
    },
    onError: (error: any) => {
      console.error('РћС€РёР±РєР° РїСЂРёРјРµРЅРµРЅРёСЏ С€Р°Р±Р»РѕРЅР°:', error)
      const message = error.response?.data?.message || error.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРёРјРµРЅРёС‚СЊ С€Р°Р±Р»РѕРЅ'
      toast.error(message)
    },
  })

  const handleAdd = () => {
    if (!evaluatorId) {
      toast.error('Р’С‹Р±РµСЂРёС‚Рµ РѕС†РµРЅРёРІР°СЋС‰РµРіРѕ СЃРѕС‚СЂСѓРґРЅРёРєР°')
      return
    }
    if (!targetId) {
      toast.error('Р’С‹Р±РµСЂРёС‚Рµ СЃРѕС‚СЂСѓРґРЅРёРєР°, РєРѕС‚РѕСЂРѕРіРѕ РѕС†РµРЅРёРІР°СЋС‚')
      return
    }
    addMutation.mutate({
      evaluatorId: Number(evaluatorId),
      targetId: Number(targetId),
    })
  }

  const handleApplyTemplate = () => {
    if (!selectedTemplateId) {
      toast.error('Р’С‹Р±РµСЂРёС‚Рµ С€Р°Р±Р»РѕРЅ РјР°С‚СЂРёС†С‹')
      return
    }
    if (!templateHasOwnTargets && !targetId) {
      toast.error('РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРёС‚Рµ СЃРѕС‚СЂСѓРґРЅРёРєР°, РєРѕС‚РѕСЂРѕРіРѕ РѕС†РµРЅРёРІР°СЋС‚')
      return
    }
    // Р•СЃР»Рё С€Р°Р±Р»РѕРЅ РёРјРµРµС‚ СЃРѕР±СЃС‚РІРµРЅРЅС‹С… РѕС†РµРЅРёРІР°РµРјС‹С…, РЅРµ РїРµСЂРµРґР°С‘Рј targetIds
    // Р•СЃР»Рё С€Р°Р±Р»РѕРЅ СѓРЅРёРІРµСЂСЃР°Р»СЊРЅС‹Р№, РїРµСЂРµРґР°С‘Рј РІС‹Р±СЂР°РЅРЅРѕРіРѕ РѕС†РµРЅРёРІР°РµРјРѕРіРѕ
    applyTemplateMutation.mutate({
      templateId: selectedTemplateId,
      targetIds: templateHasOwnTargets ? [] : [Number(targetId)],
    })
  }

  const handleEvaluatorChange = (option: any) => {
    setEvaluatorId(option?.value || '')
  }

  const handleTargetChange = (option: any) => {
    setTargetId(option?.value || '')
  }

  const handleTemplateChange = (option: any) => {
    setSelectedTemplateId(option?.value || null)
  }

  const handleDeleteClick = (id: number, evaluatorName: string, targetName: string) => {
    setDeleteModal({ isOpen: true, id, evaluatorName, targetName })
  }

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/survey/${token}`
    navigator.clipboard.writeText(url)
      .then(() => toast.success('РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР° РІ Р±СѓС„РµСЂ РѕР±РјРµРЅР°!', { icon: 'рџ“‹' }))
      .catch(() => toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ'))
  }

  if (surveyLoading || mLoading || templatesLoading) {
    return (
      <LogoLoader />
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-gray-500 hover:text-directum-dark mb-6 transition-colors animate-fadeInUp"
      >
        <ArrowLeft size={20} className="mr-2" />
        РќР°Р·Р°Рґ Рє РґР°С€Р±РѕСЂРґСѓ
      </button>

      <div className="card animate-fadeInUp">
        <h1 className="page-title mb-2">Матрица опроса</h1>
        <p className="text-gray-500 mb-6">
          РќР°Р·РЅР°С‡СЊС‚Рµ, РєС‚Рѕ РєРѕРіРѕ РѕС†РµРЅРёРІР°РµС‚ РІ СЂР°РјРєР°С… РѕРїСЂРѕСЃР° 360 РіСЂР°РґСѓСЃРѕРІ
        </p>

        <div className="flex flex-wrap gap-4 items-end p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              РЁР°Р±Р»РѕРЅ РјР°С‚СЂРёС†С‹
            </label>
            <Select
              options={templateOptions}
              value={selectedTemplate}
              onChange={handleTemplateChange}
              placeholder="Р’С‹Р±РµСЂРёС‚Рµ С€Р°Р±Р»РѕРЅ"
              isClearable
              isSearchable
              styles={reactSelectStyles}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              isDisabled={!isDraft}
            />
            {selectedTemplateObj && templateHasOwnTargets && (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                рџ’Ў РЁР°Р±Р»РѕРЅ СЃРѕРґРµСЂР¶РёС‚ {selectedTemplateObj.targets.length} РѕС†РµРЅРёРІР°РµРјС‹С…. 
                РџСЂРёРјРµРЅРёС‚СЃСЏ РєРѕ РІСЃРµРј РёРј.
              </p>
            )}
          </div>
          <button
            onClick={handleApplyTemplate}
            disabled={applyTemplateMutation.isPending || !selectedTemplateId || (!templateHasOwnTargets && !targetId)}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={applyTemplateMutation.isPending ? 'animate-spin' : ''} />
            <span>{applyTemplateMutation.isPending ? 'РџСЂРёРјРµРЅРµРЅРёРµ...' : 'РџСЂРёРјРµРЅРёС‚СЊ'}</span>
          </button>
        </div>

        {isDraft ? (
          <div className="space-y-4">
            {/* РџРµСЂРµРєР»СЋС‡Р°С‚РµР»СЊ */}
            <div className="flex flex-wrap items-center gap-4 py-2 border-b border-gray-200 pb-3">
              <span className="text-sm text-gray-500">РћС‚РѕР±СЂР°Р¶РµРЅРёРµ:</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${fillMode === 'list' ? 'text-gray-800' : 'text-gray-400'}`}>
                  РЎРїРёСЃРѕРє
                </span>
                <button
                  onClick={() => setFillMode(fillMode === 'matrix' ? 'list' : 'matrix')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    fillMode === 'matrix' ? 'bg-directum-orange' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={fillMode === 'matrix'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      fillMode === 'matrix' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${fillMode === 'matrix' ? 'text-gray-800' : 'text-gray-400'}`}>
                  РњР°С‚СЂРёС†Р°
                </span>
              </div>
            </div>

            {/* Р РµР¶РёРј СЃРїРёСЃРєР° */}
            {fillMode === 'list' && (
              <>
                {/* Р¤РѕСЂРјР° РґРѕР±Р°РІР»РµРЅРёСЏ */}
                <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-fadeInUp-delay">
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      РљРѕРіРѕ РѕС†РµРЅРёРІР°СЋС‚
                    </label>
                    <Select
                      options={targetOptions}
                      value={selectedTarget}
                      onChange={handleTargetChange}
                      placeholder="Р’С‹Р±РµСЂРёС‚Рµ СЃРѕС‚СЂСѓРґРЅРёРєР°"
                      isClearable
                      isSearchable
                      styles={reactSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      isDisabled={!isDraft}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      РљС‚Рѕ РѕС†РµРЅРёРІР°РµС‚
                    </label>
                    <Select
                      options={evaluatorOptions}
                      value={selectedEvaluator}
                      onChange={handleEvaluatorChange}
                      placeholder="Р’С‹Р±РµСЂРёС‚Рµ СЃРѕС‚СЂСѓРґРЅРёРєР°"
                      isClearable
                      isSearchable
                      styles={reactSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      isDisabled={!isDraft || !targetId}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleAdd}
                      className="btn-primary flex items-center space-x-2"
                      disabled={addMutation.isPending || !evaluatorId || !targetId}
                    >
                      <Plus size={18} />
                      <span>Р”РѕР±Р°РІРёС‚СЊ</span>
                    </button>
                  </div>
                </div>

                {/* РўР°Р±Р»РёС†Р° (СЃРїРёСЃРѕРє) */}
                {matrix?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>РњР°С‚СЂРёС†Р° РїСѓСЃС‚Р°</p>
                    <p className="text-sm">Р”РѕР±Р°РІСЊС‚Рµ СЃРІСЏР·Рё СЃ РїРѕРјРѕС‰СЊСЋ С„РѕСЂРјС‹ РІС‹С€Рµ РёР»Рё РїСЂРёРјРµРЅРёС‚Рµ С€Р°Р±Р»РѕРЅ</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto animate-fadeInUp">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">РћС†РµРЅРёРІР°РµРјС‹Р№</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">РћС†РµРЅРёРІР°РµС‚</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">РЎСЃС‹Р»РєР°</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">РЎС‚Р°С‚СѓСЃ</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Р”РµР№СЃС‚РІРёРµ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrix?.map((item, index) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors animate-fadeInUp"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <td className="py-3 px-4 text-sm">{item.targetName}</td>
                            <td className="py-3 px-4 text-sm">{item.evaluatorName}</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleCopyLink(item.token)}
                                className="text-directum-orange hover:underline text-sm flex items-center space-x-1 transition-all duration-200 hover:scale-105 group"
                              >
                                <Link size={14} className="group-hover:animate-pulse" />
                                <span>РљРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ</span>
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                item.completed
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {item.completed ? 'Р—Р°РІРµСЂС€РµРЅРѕ' : 'РћР¶РёРґР°РµС‚'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteClick(item.id, item.evaluatorName, item.targetName)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:scale-110 transform"
                                title="РЈРґР°Р»РёС‚СЊ СЃРІСЏР·СЊ"
                                disabled={deleteMutation.isPending || !isDraft || item.completed}
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Р РµР¶РёРј РјР°С‚СЂРёС†С‹ */}
            {fillMode === 'matrix' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  РњР°С‚СЂРёС†Р° РѕС†РµРЅРѕРє
                </h3>
               <SurveyMatrix
                 data={matrix || []}
                 employees={evaluatorOptions || []}
                 isDraft={isDraft}
                 onAdd={(evalId, tgtId) => addMutation.mutate({ evaluatorId: evalId, targetId: tgtId })}
                 onDelete={(id, evName, tgtName) => handleDeleteClick(id, evName, tgtName)}
                 onCopyLink={handleCopyLink}
                 isMutating={addMutation.isPending || deleteMutation.isPending}
                 deleteMutation={deleteMutation}
               />
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-700">
              вљ пёЏ Р”РѕР±Р°РІР»РµРЅРёРµ СѓС‡Р°СЃС‚РЅРёРєРѕРІ РґРѕСЃС‚СѓРїРЅРѕ С‚РѕР»СЊРєРѕ РґР»СЏ РѕРїСЂРѕСЃРѕРІ РІ СЃС‚Р°С‚СѓСЃРµ В«Р§РµСЂРЅРѕРІРёРєВ».
              <br />
              РўРµРєСѓС‰РёР№ СЃС‚Р°С‚СѓСЃ: <strong>{survey?.status === 'Active' ? 'РђРєС‚РёРІРµРЅ' : 'Р—Р°РІРµСЂС€С‘РЅ'}</strong>
            </div>
            <div className="space-y-4">
                {/* РџРµСЂРµРєР»СЋС‡Р°С‚РµР»СЊ */}
                <div className="flex flex-wrap items-center gap-4 py-2 border-b border-gray-200 pb-3">
                  <span className="text-sm text-gray-500">РћС‚РѕР±СЂР°Р¶РµРЅРёРµ:</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${fillMode === 'list' ? 'text-gray-800' : 'text-gray-400'}`}>
                      РЎРїРёСЃРѕРє
                    </span>
                    <button
                      onClick={() => setFillMode(fillMode === 'matrix' ? 'list' : 'matrix')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        fillMode === 'matrix' ? 'bg-directum-orange' : 'bg-gray-300'
                      }`}
                      role="switch"
                      aria-checked={fillMode === 'matrix'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          fillMode === 'matrix' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-medium ${fillMode === 'matrix' ? 'text-gray-800' : 'text-gray-400'}`}>
                      РњР°С‚СЂРёС†Р°
                    </span>
                  </div>
                </div>

                {/* Р РµР¶РёРј СЃРїРёСЃРєР° */}
                {fillMode === 'list' && (
                  <>
                    {/* РўР°Р±Р»РёС†Р° (СЃРїРёСЃРѕРє) */}
                    {matrix?.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>РњР°С‚СЂРёС†Р° РїСѓСЃС‚Р°</p>
                        <p className="text-sm">Р”РѕР±Р°РІСЊС‚Рµ СЃРІСЏР·Рё СЃ РїРѕРјРѕС‰СЊСЋ С„РѕСЂРјС‹ РІС‹С€Рµ</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto animate-fadeInUp">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">РћС†РµРЅРёРІР°РµРјС‹Р№</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">РћС†РµРЅРёРІР°РµС‚</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">РЎСЃС‹Р»РєР°</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">РЎС‚Р°С‚СѓСЃ</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Р”РµР№СЃС‚РІРёРµ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matrix?.map((item, index) => (
                              <tr
                                key={item.id}
                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors animate-fadeInUp"
                                style={{ animationDelay: `${index * 100}ms` }}
                              >
                                <td className="py-3 px-4 text-sm">{item.targetName}</td>
                                <td className="py-3 px-4 text-sm">{item.evaluatorName}</td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => handleCopyLink(item.token)}
                                    className="text-directum-orange hover:underline text-sm flex items-center space-x-1 transition-all duration-200 hover:scale-105 group"
                                  >
                                    <Link size={14} className="group-hover:animate-pulse" />
                                    <span>РљРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ</span>
                                  </button>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    item.completed
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {item.completed ? 'Р—Р°РІРµСЂС€РµРЅРѕ' : 'РћР¶РёРґР°РµС‚'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => handleDeleteClick(item.id, item.evaluatorName, item.targetName)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:scale-110 transform"
                                    title="РЈРґР°Р»РёС‚СЊ СЃРІСЏР·СЊ"
                                    disabled={deleteMutation.isPending || !isDraft || item.completed}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* Р РµР¶РёРј РјР°С‚СЂРёС†С‹ */}
                {fillMode === 'matrix' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      РњР°С‚СЂРёС†Р° РѕС†РµРЅРѕРє
                    </h3>
                  <SurveyMatrix
                    data={matrix || []}
                    employees={evaluatorOptions || []}
                    isDraft={isDraft}
                    onAdd={(evalId, tgtId) => addMutation.mutate({ evaluatorId: evalId, targetId: tgtId })}
                    onDelete={(id, evName, tgtName) => handleDeleteClick(id, evName, tgtName)}
                    onCopyLink={handleCopyLink}
                    isMutating={addMutation.isPending || deleteMutation.isPending}
                    deleteMutation={deleteMutation}
                  />
                  </div>
                )}
              </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={() => deleteModal.id && deleteMutation.mutate(deleteModal.id)}
        title="РЈРґР°Р»РµРЅРёРµ СЃРІСЏР·Рё"
        message={`Р’С‹ СѓРІРµСЂРµРЅС‹, С‡С‚Рѕ С…РѕС‚РёС‚Рµ СѓРґР°Р»РёС‚СЊ СЃРІСЏР·СЊ "${deleteModal.evaluatorName} в†’ ${deleteModal.targetName}"?`}
        confirmText="РЈРґР°Р»РёС‚СЊ"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

