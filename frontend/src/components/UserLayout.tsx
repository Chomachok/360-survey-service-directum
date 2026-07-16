import React from 'react'
import { Link, useNavigate, Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon, LogOut } from 'lucide-react'

const UserLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const userName = localStorage.getItem('userName') || 'Пользователь'

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userName')
    localStorage.removeItem('isAdmin')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/user" className="flex items-center space-x-2">
              <img src="/directum-logo.svg" alt="Directum" className="h-8 w-auto" />
              <span className="text-xl font-bold text-directum-orange">360</span>
            </Link>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
                {userName}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 text-gray-600 dark:text-gray-300"
                title="Выйти"
              >
                <LogOut size={20} />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                aria-label="Переключить тему"
              >
                {theme === 'light' ? <Moon size={20} className="text-gray-600" /> : <Sun size={20} className="text-yellow-400" />}
              </button>
              <div className="w-8 h-8 rounded-full bg-directum-orange flex items-center justify-center text-white font-semibold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Directum360 Feedback Service. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default UserLayout