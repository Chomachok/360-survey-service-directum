import React from 'react'
import { Link, useNavigate, Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon, LogOut, ClipboardList } from 'lucide-react'
import Directum360Logo from './Directum360Logo'
import AnimatedBackground from './AnimatedBackground'

const UserLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const userName = localStorage.getItem('userName') || 'Пользователь'
  const userEmail = localStorage.getItem('userEmail') || ''

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('isAdmin')
    navigate('/login')
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <AnimatedBackground />
      <header className="surface sticky top-0 z-50 flex-shrink-0 rounded-none border-x-0 border-t-0 bg-white/85 dark:bg-gray-800/85">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/user" aria-label="Личный кабинет" className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80">
            <Directum360Logo size={44} />
            <span className="hidden border-l border-gray-200 pl-3 text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:block">Личный кабинет</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden flex-col items-end md:flex">
              <span className="max-w-56 truncate text-sm font-semibold text-directum-dark dark:text-white">{userName}</span>
              <span className="max-w-56 truncate text-xs text-gray-400">{userEmail}</span>
            </div>
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
        <div className="border-t border-gray-100/80 bg-white/40 px-4 py-2 dark:border-gray-700/80 dark:bg-gray-900/20 md:hidden">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-directum-dark dark:text-white">{userName}</p>
              <p className="truncate text-xs text-gray-400">{userEmail}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-directum-orange dark:bg-orange-950/40 dark:text-orange-300">
              <ClipboardList size={14} /> Участник
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
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

export default UserLayout
