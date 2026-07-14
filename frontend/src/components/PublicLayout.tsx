import React from 'react'
import { Link, Outlet } from 'react-router-dom'
import Directum360Logo from './Directum360Logo'
import AnimatedBackground from './AnimatedBackground'

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AnimatedBackground />
      {/* Шапка */}
      <header className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className="flex items-center text-directum-dark dark:text-white transition-opacity hover:opacity-80"
            >
              <Directum360Logo size={42} />
            </Link>
            <span className="text-sm text-gray-500">Опрос 360 градусов</span>
          </div>
        </div>
      </header>

      {/* Основной контент – здесь будет рендериться вложенный маршрут */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>

      {/* Подвал */}
      <footer className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mt-auto">
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