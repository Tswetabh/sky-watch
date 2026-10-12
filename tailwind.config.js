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
        night: {
          950: '#030712',
          900: '#0b0f19',
          850: '#111827',
          800: '#1f2937',
        },
        redlight: {
          bg: '#050202',
          card: '#120505',
          border: '#3b0a0a',
          primary: '#ef4444',
          dim: '#991b1b',
          text: '#fca5a5',
          muted: '#7f1d1d'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
