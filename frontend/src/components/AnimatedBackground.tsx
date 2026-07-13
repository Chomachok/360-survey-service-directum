import React from 'react'
import { CHECK_BIG, CHECK_SMALL } from '../lib/directumMarks'
import { CorgiSilhouette, HedgehogSilhouette } from './Silhouettes'

/**
 * Анимированный фон приложения:
 *  - медленно плавающие размытые фирменные пятна;
 *  - слегка дрейфующая сетка;
 *  - летающие двойные галочки Directum (оригинальные контуры знака);
 *  - один силуэт корги и один силуэт ежа, неспешно проплывающие по экрану.
 *
 * Слой фиксированный, лежит под контентом (-z-10), кликов не ловит.
 * Работает в светлой и тёмной теме; при системной настройке «уменьшить движение»
 * все анимации замирают (media-query в index.css).
 *
 * ВАЖНО: у корневых <div> в Layout/PublicLayout снят собственный фон,
 * иначе он перекрывал бы этот слой.
 */

/** Двойной фирменный знак Directum — то, что «летает» по фону */
const DoubleCheck: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 30 35" className={className} fill="currentColor" aria-hidden="true">
    <path d={CHECK_BIG} fillRule="evenodd" clipRule="evenodd" />
    <path d={CHECK_SMALL} fillRule="evenodd" clipRule="evenodd" />
  </svg>
)

/** раскладка летающих галочек: позиция, размер, класс анимации, задержка */
const CHECKS = [
  { top: '12%', left: '8%', size: 'h-10', anim: 'animate-fly-a', delay: '0s' },
  { top: '68%', left: '14%', size: 'h-14', anim: 'animate-fly-b', delay: '-6s' },
  { top: '26%', left: '78%', size: 'h-12', anim: 'animate-fly-c', delay: '-12s' },
  { top: '80%', left: '70%', size: 'h-9', anim: 'animate-fly-a', delay: '-18s' },
  { top: '45%', left: '46%', size: 'h-8', anim: 'animate-fly-d', delay: '-3s' },
  { top: '8%', left: '54%', size: 'h-11', anim: 'animate-fly-b', delay: '-22s' },
  { top: '58%', left: '90%', size: 'h-8', anim: 'animate-fly-d', delay: '-9s' },
  { top: '90%', left: '34%', size: 'h-10', anim: 'animate-fly-c', delay: '-15s' },
]

const AnimatedBackground: React.FC = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* базовая заливка */}
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900" />

      {/* дрейфующая сетка */}
      <div className="bg-grid animate-grid-drift absolute inset-0" />

      {/* размытые фирменные пятна */}
      <div className="animate-blob-a absolute -left-40 -top-40 h-[38rem] w-[38rem] rounded-full bg-directum-orange/25 blur-3xl dark:bg-directum-orange/[0.14]" />
      <div className="animate-blob-b absolute -right-48 top-1/4 h-[34rem] w-[34rem] rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/[0.12]" />
      <div className="animate-blob-c absolute -bottom-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-directum-yellow/40 blur-3xl dark:bg-amber-500/[0.10]" />

      {/* летающие двойные галочки Directum */}
      {CHECKS.map((c, i) => (
        <div
          key={i}
          className={`absolute ${c.anim}`}
          style={{ top: c.top, left: c.left, animationDelay: c.delay }}
        >
          <DoubleCheck
            className={`${c.size} w-auto text-directum-orange/25 dark:text-directum-orange/20`}
          />
        </div>
      ))}

      {/* корги — плывёт справа налево (силуэт смотрит влево) */}
      <div className="animate-swim-corgi absolute" style={{ left: '100%', top: '36%' }}>
        <CorgiSilhouette className="h-28 w-auto text-directum-dark/[0.09] dark:text-white/[0.07]" />
      </div>

      {/* ёж — плывёт слева направо (зеркалим, чтобы смотрел по ходу) */}
      <div className="animate-swim-hog absolute" style={{ left: '-14%', top: '74%' }}>
        <HedgehogSilhouette className="h-24 w-auto -scale-x-100 text-directum-dark/[0.10] dark:text-white/[0.08]" />
      </div>

      {/* мягкое затемнение по краям, чтобы контент читался */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/70 dark:from-gray-900/70 dark:via-transparent dark:to-gray-900/80" />
    </div>
  )
}

export default AnimatedBackground
