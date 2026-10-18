/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sentinel: {
          900: '#070b14',
          800: '#0b1329',
          700: '#111f42',
          600: '#1b2f5e',
          500: '#284687',
        },
        hazard: {
          orange: '#f97316',
          amber: '#f59e0b',
          red: '#ef4444',
          green: '#10b981',
          cyan: '#06b6d4',
        }
      }
    },
  },
  plugins: [],
}
