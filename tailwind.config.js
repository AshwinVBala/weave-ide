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
        weave: {
          50: '#fbf7ee',
          100: '#f5ebd3',
          200: '#edd6a6',
          300: '#e3bc73',
          400: '#d99e43',
          500: '#cf8124',
          600: '#b4631b',
          700: '#8e4819',
          800: '#733a1b',
          900: '#60311a',
          950: '#37180b',
        },
        editor: {
          bg: '#08090C',
          sidebar: '#08090C',
          activity: '#08090C',
          panel: '#0B0C10',
          activeTab: '#10121A',
          inactiveTab: '#08090C',
          border: 'rgba(255, 255, 255, 0.05)',
          hover: '#12141D',
          text: '#F9FAFB',
          muted: '#6B7280',
          accent: '#FF9D00',
          cyan: '#00E5FF',
          highlight: '#161822',
        },
        studio: {
          bg: '#08090C',
          surface: '#0B0C10',
          card: 'rgba(11, 12, 16, 0.85)',
          glass: 'rgba(14, 16, 22, 0.75)',
          border: 'rgba(255, 255, 255, 0.05)',
          glow: 'rgba(255, 157, 0, 0.15)',
          amberGlow: 'rgba(255, 157, 0, 0.25)',
        },
        brand: {
          amber: '#FF9D00',
          cyan: '#00E5FF',
          purple: '#8B5CF6',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-amber': '0 0 20px -2px rgba(255, 157, 0, 0.35)',
        'glow-cyan': '0 0 20px -2px rgba(0, 229, 255, 0.25)',
        'glass': '0 12px 40px 0 rgba(0, 0, 0, 0.55)',
        'floating': '0 20px 60px -10px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(255, 255, 255, 0.06)',
      }
    },
  },
  plugins: [],
}
