import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getUserSurveys } from '../api/user'

export default function ProtectedRoute() {
  const token = localStorage.getItem('authToken')
  const location = useLocation()
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (!token) {
      setIsValid(false)
      return
    }

    // Проверяем валидность токена через запрос к защищённому API
    getUserSurveys()
      .then(() => setIsValid(true))
      .catch(() => {
        // Если токен невалиден (401), очищаем и перенаправляем
        localStorage.removeItem('authToken')
        localStorage.removeItem('userName')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('isAdmin')
        setIsValid(false)
        window.location.href = '/login'
      })
  }, [token])

  if (isValid === null) {
    // Показываем загрузку, пока проверяем токен
    return <div className="flex items-center justify-center h-64">Проверка авторизации...</div>
  }

  if (!isValid || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}