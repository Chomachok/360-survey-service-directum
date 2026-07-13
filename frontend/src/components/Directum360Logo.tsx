import React from 'react'
import { CHECK_BIG, CHECK_SMALL, WORDMARK, MARK_PIVOT, DIRECTUM_ORANGE } from '../lib/directumMarks'

/**
 * Логотип сервиса.
 *
 * В центре — «360». Вокруг по орбите плавно вращаются ДВА фирменных знака Directum,
 * каждый из которых сам по себе двойной (большая + малая галочка — оригинальный знак).
 * Знаки не «стоят прямо», а всё время развёрнуты остриём НА «360»: контр-вращения нет,
 * вместо него у каждого знака фиксированный базовый разворот, поэтому при повороте
 * орбиты направление на центр сохраняется автоматически.
 *
 * Геометрия:
 *   остриё знака в родном положении смотрит под углом ~210° от его центра;
 *   знак снизу (θ=90°)  -> rotate(60°)  => остриё вверх, на центр;
 *   знак сверху (θ=270°) -> rotate(240°) => остриё вниз, на центр.
 *
 * Цвета: галочки — фирменный оранжевый #FF8600; «360» и слово «Directum» — currentColor,
 * поэтому логотип сам подстраивается под светлую и тёмную тему.
 */

const ORANGE = DIRECTUM_ORANGE

/** центр bbox двойного знака — вокруг него разворачиваем */
const PIVOT_X = MARK_PIVOT.x
const PIVOT_Y = MARK_PIVOT.y

/** радиус орбиты и масштаб знака */
const R = 45
const S = 0.58

/** двойной фирменный знак: большая + малая галочка */
const DoubleCheck: React.FC<{ x: number; y: number; rotate: number }> = ({ x, y, rotate }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${S}) translate(${-PIVOT_X} ${-PIVOT_Y})`}>
    <path d={CHECK_BIG} fill={ORANGE} fillRule="evenodd" clipRule="evenodd" />
    <path d={CHECK_SMALL} fill={ORANGE} fillRule="evenodd" clipRule="evenodd" />
  </g>
)

interface Props {
  /** высота знака в px */
  size?: number
  /** показывать слово «Directum» рядом со знаком */
  withWordmark?: boolean
  /** длительность полного оборота, сек */
  duration?: number
  className?: string
}

const Directum360Logo: React.FC<Props> = ({
  size = 40,
  withWordmark = true,
  duration = 14,
  className = '',
}) => {
  // если у пользователя включено «уменьшить движение» — не крутим
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const dur = `${duration}s`

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role="img"
        aria-label="Directum 360"
        className="shrink-0 overflow-visible"
      >
        <defs>
          <radialGradient id="d360-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ORANGE} stopOpacity="0.35" />
            <stop offset="60%" stopColor={ORANGE} stopOpacity="0.10" />
            <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* пульсирующее свечение — «живой» фон под знаком */}
        <circle cx="60" cy="60" r="52" fill="url(#d360-glow)">
          {!reduceMotion && (
            <>
              <animate
                attributeName="opacity"
                values="0.55;1;0.55"
                dur="4s"
                repeatCount="indefinite"
              />
              <animate attributeName="r" values="46;54;46" dur="4s" repeatCount="indefinite" />
            </>
          )}
        </circle>

        {/* орбита */}
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={ORANGE}
          strokeOpacity="0.25"
          strokeWidth="1.6"
          strokeDasharray="3 6"
          strokeLinecap="round"
        >
          {!reduceMotion && (
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="18"
              dur="2.5s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* «360» — currentColor, белеет в тёмной теме */}
        <text
          x="60"
          y="61"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Golos Text', Inter, system-ui, sans-serif"
          fontWeight="700"
          fontSize="30"
          letterSpacing="-0.5"
          fill="currentColor"
        >
          360
        </text>

        {/* орбита с двумя двойными знаками, всегда остриём на «360» */}
        <g>
          {!reduceMotion && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 60 60"
              to="360 60 60"
              dur={dur}
              repeatCount="indefinite"
            />
          )}
          {/* снизу: разворот 60° -> остриё вверх, на центр */}
          <DoubleCheck x={60} y={60 + R} rotate={60} />
          {/* сверху: разворот 240° -> остриё вниз, на центр */}
          <DoubleCheck x={60} y={60 - R} rotate={240} />
        </g>
      </svg>

      {withWordmark && (
        <svg
          viewBox="37.28 7.44 98.72 18.9"
          height={size * 0.42}
          width={size * 0.42 * (98.72 / 18.9)}
          role="img"
          aria-label="Directum"
          className="shrink-0"
        >
          {WORDMARK.map((d, i) => (
            <path key={i} d={d} fill="currentColor" />
          ))}
        </svg>
      )}
    </span>
  )
}

export default Directum360Logo
