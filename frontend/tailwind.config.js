/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        directum: {
          orange: "#FF8600",
          yellow: "#FCE3A0",
          dark: "#1E2128",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        // фирменный шрифт Directum
        directum: ["'Golos Text'", "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        // ВАЖНО: fill-mode `backwards`, а не `both`.
        // `both` навсегда фиксировал transform: translateY(0) scale(1) после
        // окончания анимации, и этот "залипший" transform перебивал
        // hover:-translate-y-1 у карточки -> hover дёргался/не работал.
        // `backwards` держит только начальный кадр во время delay,
        // а после завершения отпускает transform обратно в CSS.
        fadeInUp: 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        fadeIn: 'fadeIn 0.5s ease-out backwards',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
        slideIn: 'slideIn 0.5s ease-out backwards',
        'fadeInUp-delay': 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s backwards',
        'fadeInUp-delay-2': 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s backwards',
        'fadeInUp-delay-3': 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.6s backwards',
      },
    },
  },
  plugins: [],
}
