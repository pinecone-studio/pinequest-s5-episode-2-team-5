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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hud: '0 6px 20px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};
