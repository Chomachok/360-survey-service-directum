import axios from 'axios'

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401) return 'Сессия истекла. Войдите в систему и повторите действие.'
    if (status === 403) return 'Недостаточно прав. Для управления сотрудниками нужна роль SystemAdministrator.'

    const data = error.response?.data as { message?: unknown; title?: unknown } | string | undefined
    if (typeof data === 'string' && data.trim()) return data
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string' && data.message.trim()) return data.message
      if (typeof data.title === 'string' && data.title.trim()) return data.title
    }
    if (!error.response) return 'Не удалось связаться с сервером. Проверьте подключение и повторите попытку.'
  }
  return fallback
}
