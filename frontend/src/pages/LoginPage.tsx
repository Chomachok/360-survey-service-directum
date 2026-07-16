
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { sendCode, verifyCode } from '../api/auth'
import { useTheme } from '../contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'
import AnimatedBackground from '../components/AnimatedBackground'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [isLoading, setIsLoading] = useState(false)

  // Получаем URL для редиректа после логина
  const redirectPath = searchParams.get('redirect') || location.state?.from?.pathname || '/'

  // Если пользователь уже авторизован, сразу редиректим
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (token) {
      // Редирект на нужный путь
      navigate(redirectPath, { replace: true })
    }
  }, [navigate, redirectPath])

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Введите email')
      return
    }
    setIsLoading(true)
    try {
      await sendCode(email)
      toast.success('Код отправлен на email')
      setStep('code')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка отправки кода')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) {
      toast.error('Введите код')
      return
    }
    setIsLoading(true)
    try {
      const response = await verifyCode(email, code)
      localStorage.setItem('authToken', response.token)
      localStorage.setItem('userName', response.fullName)
      localStorage.setItem('userEmail', response.email)
      localStorage.setItem('isAdmin', String(response.isAdmin))
      toast.success('Вход выполнен успешно')

      // После логина редирект на сохранённый путь
      navigate(redirectPath, { replace: true })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Неверный код')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <AnimatedBackground />
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Переключить тему"
      >
        {theme === 'light' ? <Moon size={24} className="text-gray-600" /> : <Sun size={24} className="text-yellow-400" />}
      </button>

      <div className="max-w-md w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-lg p-8 animate-fadeInUp">
        <div className="text-center mb-8">
          <img src="/directum-logo.svg" alt="Directum" className="h-12 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-directum-dark dark:text-white">
            Вход в Directum360
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {step === 'email'
              ? 'Введите ваш email, чтобы получить код'
              : 'Введите код из письма'}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="ivanov@example.com"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full flex justify-center"
              disabled={isLoading}
            >
              {isLoading ? 'Отправка...' : 'Получить код'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="label-field">Код из письма</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input-field text-center text-2xl tracking-widest"
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
              />
              <p className="text-sm text-gray-400 mt-2">
                Код отправлен на {email}.{' '}
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-directum-orange hover:underline"
                >
                  Изменить email
                </button>
              </p>
            </div>
            <button
              type="submit"
              className="btn-primary w-full flex justify-center"
              disabled={isLoading}
            >
              {isLoading ? 'Проверка...' : 'Войти'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}