import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function ProtectedRoute() {
  const token = localStorage.getItem('authToken')
  const location = useLocation()

  if (!token) {
    // Передаём текущий путь как redirect-параметр
    const redirect = location.pathname + location.search
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} state={{ from: location }} replace />
  }
  return <Outlet />
}