import React, { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import Directum360Logo from './Directum360Logo'
import AnimatedBackground from './AnimatedBackground'
import { Sun, Moon, LayoutDashboard, FileText, ListChecks, Users, FileSpreadsheet, UserCheck, ChevronDown, LogOut } from 'lucide-react'

const Layout: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userName = localStorage.getItem('userName') || 'Администратор'

  const navItems = [
    { path: '/', label: 'Дашборд', icon: LayoutDashboard },
    { path: '/survey/new', label: 'Создать опрос', icon: FileText },
    { path: '/import', label: 'Импорт сотрудников', icon: Users },
  ]

  const templateItems = [
    { path: '/templates', label: 'Шаблоны вопросов', icon: ListChecks },
    { path: '/survey-templates', label: 'Шаблоны опросов', icon: FileSpreadsheet },
    { path: '/respondent-templates', label: 'Шаблоны респондентов', icon: UserCheck },
  ]

  const isTemplateActive = templateItems.some(item => location.pathname === item.path)

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('isAdmin')
    navigate('/login')
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTemplatesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatedBackground />
      <header className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center text-directum-dark dark:text-white transition-opacity hover:opacity-80">
              <Directum360Logo size={42} />
            </Link>

            <nav className="hidden md:flex items-center space-x-1 ml-4 flex-shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={true}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                        isActive
                          ? 'bg-directum-orange text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                    isTemplateActive || isTemplatesOpen
                      ? 'bg-directum-orange text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105'
                  }`}
                >
                  <ListChecks size={18} />
                  <span>Шаблоны</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isTemplatesOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTemplatesOpen && (
                  <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-fadeInUp">
                    {templateItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={true}
                          className={({ isActive }) =>
                            `flex items-center space-x-2 px-4 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-directum-yellow text-directum-dark dark:bg-gray-700'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`
                          }
                          onClick={() => setIsTemplatesOpen(false)}
                        >
                          <Icon size={18} />
                          <span>{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            </nav>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
                {userName}
              </span>
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

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 text-gray-600 dark:text-gray-300"
                title="Выйти"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden bg-white/85 dark:bg-gray-800/85 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40 flex-shrink-0">
        <div className="flex overflow-x-auto px-4 py-2 space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={true}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-directum-orange text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })
          })
          <div className="relative">
            <button
              onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center space-x-1.5 ${
                isTemplateActive || isTemplatesOpen
                  ? 'bg-directum-orange text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ListChecks size={16} />
              <span>Шаблоны</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isTemplatesOpen ? 'rotate-180' : ''}`} />
            </button>
            {isTemplatesOpen && (
              <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                {templateItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={true}
                      className={({ isActive }) =>
                        `flex items-center space-x-2 px-4 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-directum-yellow text-directum-dark dark:bg-gray-700'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`
                      }
                      onClick={() => setIsTemplatesOpen(false)}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
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