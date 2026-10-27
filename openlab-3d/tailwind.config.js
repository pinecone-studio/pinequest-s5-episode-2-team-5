/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lab: {
          yellow: '#F5B800',
          yellowDark: '#D99E00',
          panel: 'rgba(60,60,60,0.7)',
          ink: '#1f2328',
          cyan: '#38e1ff',
        },
        // Шинэ цэсний өнгө: утгыг нь src/theme/themes.ts тодорхойлно (CSS хувьсагчаар дамжина)
        t: {
          ink: 'var(--t-ink)',
          'ink-soft': 'var(--t-ink-soft)',
          card: 'var(--t-card)',
          'card-active': 'var(--t-card-active)',
          accent: 'var(--t-accent)',
          'accent-ink': 'var(--t-accent-ink)',
          primary: 'var(--t-primary)',
          'primary-ink': 'var(--t-primary-ink)',
          liquid: 'var(--t-liquid)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        // Шинэ цэс: гарчиг Unbounded (Ө, Ү үсэг байхгүй тул Onest-д шилжинэ), бичиг Onest
        heading: ['Unbounded', 'Onest', 'system-ui', 'sans-serif'],
        body: ['Onest', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hud: '0 6px 20px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};
