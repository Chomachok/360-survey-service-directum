import React from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import Directum360Logo from './Directum360Logo'
import AnimatedBackground from './AnimatedBackground'
import { Sun, Moon, LayoutDashboard, FileText, ListChecks, Users, FileSpreadsheet, UserCheck } from 'lucide-react'

const Layout: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Дашборд', icon: LayoutDashboard },
    { path: '/survey/new', label: 'Создать опрос', icon: FileText },
    { path: '/templates', label: 'Шаблоны вопросов', icon: ListChecks },
    { path: '/survey-templates', label: 'Шаблоны опросов', icon: FileSpreadsheet },
    { path: '/respondent-templates', label: 'Шаблоны респондентов', icon: UserCheck },
    { path: '/import', label: 'Импорт сотрудников', icon: Users },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatedBackground />
      <header className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 flex-shrink-0">
        {/* ... шапка, как раньше ... */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className="flex items-center text-directum-dark dark:text-white transition-opacity hover:opacity-80"
            >
              <Directum360Logo size={42} />
            </Link>
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                      isActive(item.path)
                        ? 'bg-directum-orange text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="flex items-center space-x-3">
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-110">
                {theme === 'light' ? <Moon size={20} className="text-gray-600 dark:text-gray-300" /> : <Sun size={20} className="text-yellow-400" />}
              </button>
              <div className="w-8 h-8 rounded-full bg-directum-orange flex items-center justify-center text-white font-semibold text-sm">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden bg-white/85 dark:bg-gray-800/85 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40 flex-shrink-0">
        {/* мобильная навигация */}
        <div className="flex overflow-x-auto px-4 py-2 space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center space-x-1.5 ${
                  isActive(item.path)
                    ? 'bg-directum-orange text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet /> {}
      </main>

      <footer className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Directum360 Feedback Service. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Layout