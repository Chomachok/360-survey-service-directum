import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import Directum360Logo from './Directum360Logo'
import AnimatedBackground from './AnimatedBackground'
import {
  Sun, Moon, LayoutDashboard, FileText, ListChecks, Users, FileSpreadsheet,
  UserCheck, ChevronDown, LogOut,
} from 'lucide-react'

const templateItems = [
  { path: '/templates', label: 'Вопросы', icon: ListChecks },
  { path: '/survey-templates', label: 'Опросы', icon: FileSpreadsheet },
  { path: '/respondent-templates', label: 'Респонденты', icon: UserCheck },
]

const mainItems = [
  { path: '/', label: 'Дашборд', icon: LayoutDashboard },
  { path: '/survey/new', label: 'Создать опрос', icon: FileText },
  { path: '/employees', label: 'Сотрудники', icon: Users },
]

const Layout: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userName = localStorage.getItem('userName') || 'Администратор'
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsTemplatesOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => setIsTemplatesOpen(false), [location.pathname])

  const navClass = (isActive: boolean) => `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-orange-50 text-directum-orange dark:bg-orange-950/40 dark:text-orange-300'
      : 'text-gray-600 hover:bg-gray-100 hover:text-directum-dark dark:text-gray-300 dark:hover:bg-gray-700/70 dark:hover:text-white'
  }`

  return (
    <div className="relative flex min-h-screen flex-col">
      <AnimatedBackground />
      <header className="surface sticky top-0 z-50 flex-shrink-0 rounded-none border-x-0 border-t-0 bg-white/85 dark:bg-gray-800/85">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="На главную" className="flex shrink-0 items-center transition-opacity hover:opacity-80">
            <Directum360Logo size={44} />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
            {mainItems.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} end={path !== '/employees'} className={({ isActive }) => navClass(isActive)}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsTemplatesOpen(value => !value)}
                aria-expanded={isTemplatesOpen}
                className={navClass(isTemplateActive || isTemplatesOpen)}
              >
                <ListChecks size={17} strokeWidth={1.8} />
                <span>Шаблоны</span>
                <ChevronDown size={15} className={`transition-transform ${isTemplatesOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTemplatesOpen && (
                <div className="surface absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden p-1.5 shadow-xl">
                  {templateItems.map(({ path, label, icon: Icon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-orange-50 text-directum-orange dark:bg-orange-950/40 dark:text-orange-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                      onClick={() => setIsTemplatesOpen(false)}
                    >
                      <Icon size={17} />
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden max-w-40 truncate text-sm font-medium text-gray-600 dark:text-gray-300 xl:block" title={userName}>{userName}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-directum-orange text-sm font-semibold text-white shadow-sm" aria-hidden="true">
              {userName.charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
              title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} className="text-amber-300" />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-950/30 dark:hover:text-red-300"
              aria-label="Выйти"
              title="Выйти"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>

        <nav className="border-t border-gray-100/80 px-3 py-2 dark:border-gray-700/80 lg:hidden" aria-label="Мобильная навигация">
          <div className="mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto">
            {mainItems.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} end={path !== '/employees'} className={({ isActive }) => `${navClass(isActive)} shrink-0 px-2.5 text-xs sm:text-sm`}>
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setIsTemplatesOpen(value => !value)}
              aria-expanded={isTemplatesOpen}
              className={`${navClass(isTemplateActive || isTemplatesOpen)} shrink-0 px-2.5 text-xs sm:text-sm`}
            >
              <ListChecks size={16} />
              <span>Шаблоны</span>
              <ChevronDown size={14} className={`transition-transform ${isTemplatesOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {isTemplatesOpen && (
            <div className="mx-auto mt-2 flex max-w-[1440px] flex-wrap gap-1 border-t border-gray-100 pt-2 dark:border-gray-700">
              {templateItems.map(({ path, label, icon: Icon }) => (
                <NavLink key={path} to={path} className={({ isActive }) => `${navClass(isActive)} text-xs sm:text-sm`} onClick={() => setIsTemplatesOpen(false)}>
                  <Icon size={15} />{label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200/70 bg-white/65 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/60">
        <div className="mx-auto max-w-[1440px] px-4 text-center text-xs text-gray-400 sm:px-6 sm:text-sm lg:px-8">
          © {new Date().getFullYear()} Directum360 Feedback Service
        </div>
      </footer>
    </div>
  )
}

export default Layout
