import React from 'react'
import Directum360Logo from './Directum360Logo'

interface Props {
  /** текст под логотипом */
  label?: string
  /** высота логотипа в px */
  size?: number
  /** высота обёртки (для центрирования по вертикали внутри блока страницы) */
  minHeight?: number | string
  className?: string
}

/** Индикатор загрузки страницы/раздела: крутящийся логотип вместо кольцевого спиннера */
const LogoLoader: React.FC<Props> = ({ label, size = 72, minHeight = 256, className = '' }) => (
  <div
    className={`flex items-center justify-center ${className}`}
    style={{ minHeight }}
  >
    <div className="text-center animate-pulseSoft">
      <Directum360Logo size={size} withWordmark={false} spinning duration={1.6} />
      {label && <p className="mt-4 text-gray-500">{label}</p>}
    </div>
  </div>
)

export default LogoLoader
