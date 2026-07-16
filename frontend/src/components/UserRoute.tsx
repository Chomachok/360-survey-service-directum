import { Navigate, Outlet } from 'react-router-dom'

export default function UserRoute() {
  const token = localStorage.getItem('authToken')
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  if (!token) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}