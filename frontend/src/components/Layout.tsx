import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'  // 👈 импортируем Outlet
import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon, LayoutDashboard, FileText, Users, ChevronDown, ListChecks, FileSpreadsheet, Grid } from 'lucide-react'

const Layout: React.FC = () => {  // 👈 убираем children из пропсов
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const navItems = [
    { path: '/', label: 'Дашборд', icon: LayoutDashboard },
    { path: '/survey/new', label: 'Создать опрос', icon: FileText },
    { path: '/import', label: 'Импорт сотрудников', icon: Users },
  ]

  const templateItems = [
    { path: '/templates', label: 'Шаблоны вопросов', icon: ListChecks },
    { path: '/survey-templates', label: 'Шаблоны опросов', icon: FileSpreadsheet },
    { path: '/respondent-templates', label: 'Шаблоны матриц', icon: Grid },
  ]

  const isActive = (path: string) => location.pathname === path
  const isTemplateActive = templateItems.some(item => isActive(item.path))

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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/directum-logo.svg" alt="Directum" className="h-8 w-auto" />
              <span className="text-xl font-bold text-directum-orange">360</span>
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
                      const active = isActive(item.path)
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center space-x-2 px-4 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-directum-yellow text-directum-dark dark:bg-gray-700'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => setIsTemplatesOpen(false)}
                        >
                          <Icon size={18} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </nav>

            <div className="flex items-center space-x-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-110"
                aria-label="Переключить тему"
              >
                {theme === 'light' ? <Moon size={20} className="text-gray-600" /> : <Sun size={20} className="text-yellow-400" />}
              </button>
              <div className="w-8 h-8 rounded-full bg-directum-orange flex items-center justify-center text-white font-semibold text-sm transition-all duration-300 hover:scale-110 hover:shadow-md">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40 flex-shrink-0">
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
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-4 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-directum-yellow text-directum-dark dark:bg-gray-700'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => setIsTemplatesOpen(false)}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div key={location.pathname} className="animate-fadeInUp">
          <Outlet />  {/* 👈 вместо children */}
        </div>
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

export default Layout