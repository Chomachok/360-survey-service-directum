import React from 'react'

interface LogoProps {
  /** Высота знака в пикселях */
  height?: number
  /** Показывать текстовую часть рядом со знаком */
  withText?: boolean
}

/**
 * Знак сервиса: цифры «360» и три галочки, вращающиеся вокруг них по орбите.
 * Галочки — оригинальные (не товарный знак Directum), в фирменной оранжевой гамме.
 * Цвет цифр берётся из currentColor, поэтому знак сам подстраивается под тему.
 */
const Logo: React.FC<LogoProps> = ({ height = 36, withText = true }) => (
  <span className="inline-flex items-center gap-2.5">
    <svg
      height={height}
      viewBox="-14 -12 178 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible text-directum-dark dark:text-gray-100"
      role="img"
      aria-label="360 градусов"
    >
      <defs>
        <linearGradient id="logo-orbit" x1="0" y1="70" x2="150" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFB03A" />
          <stop offset="0.55" stopColor="#FF8600" />
          <stop offset="1" stopColor="#F4711F" />
        </linearGradient>
      </defs>

      {/* Орбита: эллипс задаётся сжатием по вертикали, вращается группа внутри.
          Рисуется до цифр, поэтому галочки проходят за числом. */}
      <g transform="translate(75 44) scale(1 0.62)">
        <g className="animate-orbit origin-center motion-reduce:animate-none">
          {[0, 120, 240].map((angle, i) => (
            <g key={angle} transform={`rotate(${angle}) translate(70 0)`}>
              <path
                d="M -12 -9 L 0 7 L 18 -13"
                stroke="url(#logo-orbit)"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={[1, 0.72, 0.45][i]}
              />
            </g>
          ))}
        </g>
      </g>

      {/* Цифры — цветом текста темы */}
      <text
        x="75"
        y="57"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="44"
        fill="currentColor"
        letterSpacing="-1"
      >
        360
      </text>
      <circle cx="128" cy="24" r="6.5" stroke="#FF8600" strokeWidth="4.5" fill="none" />
    </svg>

    {withText && (
      <span className="text-lg font-semibold text-directum-dark dark:text-gray-100 whitespace-nowrap">
        Оценка&nbsp;360
      </span>
    )}
  </span>
)

export default Logo
