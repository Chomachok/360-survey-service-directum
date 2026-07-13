import React from 'react'
import { Link, Outlet } from 'react-router-dom'
import Logo from './Logo'

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Шапка */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <Logo height={38} />
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">Опрос 360 градусов</span>
          </div>
        </div>
      </header>

      {/* Основной контент – здесь будет рендериться вложенный маршрут */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>

      {/* Подвал */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Directum360. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout