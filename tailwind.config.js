/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fdfaf3',
          100: '#faf4e6',
          200: '#f3e9d2',
        },
        ivory: {
          50: '#fffdf7',
          100: '#fbf6ea',
        },
        terracotta: {
          300: '#e0a48a',
          500: '#c67a5b',
          600: '#b0623f',
          700: '#8f4c2f',
        },
        gold: {
          300: '#e6c78a',
          500: '#c9a15b',
          700: '#9a7838',
        },
        charcoal: {
          300: '#8a7d72',
          500: '#5a4f46',
          700: '#3f3730',
          800: '#322b25',
          900: '#2a2520',
          950: '#1c1814',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        warm: '0 1px 3px rgba(143, 76, 47, 0.08), 0 6px 24px rgba(143, 76, 47, 0.06)',
        'warm-dark': '0 1px 3px rgba(0, 0, 0, 0.35), 0 6px 24px rgba(0, 0, 0, 0.25)',
      },
      borderRadius: {
        journal: '14px',
      },
      keyframes: {
        bloom: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'warm-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(198, 122, 91, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(198, 122, 91, 0)' },
        },
      },
      animation: {
        bloom: 'bloom 400ms ease-out both',
        'warm-pulse': 'warm-pulse 1.6s ease-in-out 1',
      },
    },
  },
  plugins: [],
};
