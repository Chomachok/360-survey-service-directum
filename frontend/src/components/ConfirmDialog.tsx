import React, { useState, useCallback } from 'react'
import { X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Подтверждение',
  message,
  confirmText = 'Да, удалить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeInUp">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-directum-dark dark:text-white">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Хук для удобного использования
export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [resolve, setResolve] = useState<(value: boolean) => void>(() => () => {})
  const [config, setConfig] = useState<{
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
  }>({ message: '' })

  const confirm = useCallback(
    (message: string, options?: { title?: string; confirmText?: string; cancelText?: string }) => {
      return new Promise<boolean>((res) => {
        setConfig({ message, ...options })
        setResolve(() => res)
        setIsOpen(true)
      })
    },
    []
  )

  const handleConfirm = () => {
    setIsOpen(false)
    resolve(true)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolve(false)
  }

  return {
    confirm,
    ConfirmDialog: () => (
      <ConfirmDialog
        isOpen={isOpen}
        title={config.title}
        message={config.message}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
  }
}