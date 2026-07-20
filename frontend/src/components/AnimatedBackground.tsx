import React from 'react'

/**
 * Анимированный фон приложения: медленно плавающие фирменные пятна (оранжевый Directum
 * + холодный синий) под размытием и слегка дрейфующая сетка.
 *
 * Слой фиксированный, лежит под контентом (-z-10), не ловит клики.
 * Работает и в светлой, и в тёмной теме; при системной настройке
 * «уменьшить движение» анимации останавливаются (см. media-query в index.css).
 *
 * ВАЖНО: у корневых <div> в Layout/PublicLayout снят собственный фон,
 * иначе он перекрывал бы этот слой.
 */
// Двойной фирменный знак Directum — оригинальные контуры официального логотипа
const CHECK_BIG =
  'M15.6928 25.1513C16.5848 27.4544 17.3223 29.3584 17.5741 30.0912C18.2693 32.1137 18.0113 33.4108 17.2247 33.9349C16.0746 34.7012 14.5878 34.2586 12.8478 32.2768C11.6878 31.0027 8.62066 27.0001 6.15565 22.7533C4.41564 19.922 2.66139 16.4636 0.564835 12.2705C-1.19341 7.46505 1.39278 5.94631 5.0178 4.53069C8.93281 2.97351 14.5878 1.41633 17.7778 0.850086C20.0979 0.425401 23.6816 0.0564476 24.4479 1.41633C24.8829 2.2657 24.5515 3.58425 22.4661 4.93255C22.0641 5.17784 21.076 5.78855 19.8779 6.52909C17.6187 7.92543 14.6128 9.78334 13.381 10.5234C11.206 11.7974 11.3005 13.6503 11.8805 15.0659C12.8198 17.7336 14.4149 21.852 15.6928 25.1513Z'
const CHECK_SMALL =
  'M24.4524 22.6397C24.9287 23.9113 25.3224 24.9626 25.4569 25.3672C25.647 25.9391 25.6593 26.6558 25.6384 26.804C25.5116 27.7011 24.5568 27.8266 23.8468 27.3976C23.5621 27.2256 23.2591 26.9575 22.9334 26.5738C22.314 25.8704 20.6764 23.6605 19.3602 21.3158C18.4312 19.7526 17.4946 17.8432 16.3751 15.5281C15.4364 12.875 16.8172 12.0364 18.7527 11.2549C20.843 10.3951 23.8624 9.53539 25.5657 9.22276C25.6328 9.21005 25.7014 9.19687 25.7713 9.18345C26.9908 8.94921 28.5869 8.64263 29.127 9.53539C29.4096 10.0027 29.1823 10.7323 28.0688 11.4767C27.8542 11.6122 27.3266 11.9494 26.6869 12.3582C25.4807 13.1291 23.8757 14.1549 23.2181 14.5635C22.0568 15.2669 22.1072 16.2899 22.4169 17.0715C22.9184 18.5444 23.7701 20.8182 24.4524 22.6397Z'

/** Двойная фирменная галочка, которая «летает» по фону */
const DoubleCheck: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 30 35" className={className} fill="currentColor" aria-hidden="true">
    <path d={CHECK_BIG} fillRule="evenodd" clipRule="evenodd" />
    <path d={CHECK_SMALL} fillRule="evenodd" clipRule="evenodd" />
  </svg>
)

/** раскладка летающих галочек: позиция, размер, класс анимации, сдвиг фазы */
const CHECKS = [
  { top: '12%', left: '8%', size: 'h-16', anim: 'animate-fly-a', delay: '0s' },
  { top: '68%', left: '14%', size: 'h-24', anim: 'animate-fly-b', delay: '-6s' },
  { top: '26%', left: '78%', size: 'h-20', anim: 'animate-fly-c', delay: '-12s' },
  { top: '80%', left: '70%', size: 'h-14', anim: 'animate-fly-a', delay: '-18s' },
  { top: '45%', left: '46%', size: 'h-12', anim: 'animate-fly-d', delay: '-3s' },
  { top: '8%', left: '54%', size: 'h-20', anim: 'animate-fly-b', delay: '-22s' },
  { top: '58%', left: '90%', size: 'h-12', anim: 'animate-fly-d', delay: '-9s' },
  { top: '90%', left: '34%', size: 'h-16', anim: 'animate-fly-c', delay: '-15s' },
]

const AnimatedBackground: React.FC = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* базовая заливка */}
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900" />

      {/* дрейфующая сетка */}
      <div className="bg-grid animate-grid-drift absolute inset-0" />

      {/* плавающие фирменные пятна */}
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

      {/* мягкое затемнение по краям, чтобы контент читался */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/70 dark:from-gray-900/70 dark:via-transparent dark:to-gray-900/80" />
    </div>
  )
}

export default AnimatedBackground
