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

      {/* мягкое затемнение по краям, чтобы контент читался */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/70 dark:from-gray-900/70 dark:via-transparent dark:to-gray-900/80" />
    </div>
  )
}

export default AnimatedBackground
