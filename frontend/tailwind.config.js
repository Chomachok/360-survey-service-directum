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
        // промежуточный оттенок для ховера карточек в тёмной теме
        gray: { 750: "#2d3542" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
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
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        fadeIn: 'fadeIn 0.5s ease-out',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
        slideIn: 'slideIn 0.5s ease-out',
        'fadeInUp-delay': 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both',
        'fadeInUp-delay-2': 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both',
        'fadeInUp-delay-3': 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both',
        orbit: 'orbit 7s linear infinite',
      },
    },
  },
  plugins: [],
}