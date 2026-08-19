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
          bg: '#0e1017',
          sidebar: '#12151e',
          activity: '#0a0c10',
          panel: '#12151e',
          activeTab: '#141824',
          inactiveTab: '#0e1017',
          border: '#1f2533',
          hover: '#1a1f2c',
          text: '#e2e8f0',
          muted: '#818da4',
          accent: '#FF9D00',
          cyan: '#00E5FF',
          highlight: '#242c3d',
        },
        studio: {
          bg: '#0a0c10',
          card: 'rgba(14, 16, 23, 0.75)',
          glass: 'rgba(20, 24, 35, 0.7)',
          border: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(0, 229, 255, 0.15)',
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
        'glow-amber': '0 0 20px -3px rgba(255, 157, 0, 0.35)',
        'glow-cyan': '0 0 20px -3px rgba(0, 229, 255, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
