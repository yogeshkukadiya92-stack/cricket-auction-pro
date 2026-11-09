/** @type {import('tailwindcss').Config} */

// "Night match" palette: turf-black surfaces, chalk neutrals, floodlight lime.
const turquoise = {
  50: '#ECFBF7', 100: '#D2F6EC', 200: '#A8ECDB', 300: '#7BE0C8', 400: '#5AD3B8', 500: '#37BFA2',
  600: '#259B84', 700: '#1E7A69', 800: '#1A5F53', 900: '#164C43', 950: '#0B2C27',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#070B08',
          900: '#0C120E',
          850: '#111914',
          800: '#18221B',
          700: '#243128',
        },
        gold: {
          300: '#E6FF85',
          400: '#D9FF4F',
          500: '#C8F31D',
          600: '#A3CC00',
          glow: 'rgba(200, 243, 29, 0.35)',
        },
        slate: {
          50: '#F6F6EE',
          100: '#ECECE2',
          200: '#DADBCE',
          300: '#BDC0B2',
          400: '#9CA192',
          500: '#7F8578',
          600: '#555C50',
          700: '#3A4238',
          800: '#252C26',
          900: '#161C17',
          950: '#0C110D',
        },
        cyan: turquoise,
        blue: turquoise,
        indigo: turquoise,
        purple: turquoise,
        violet: turquoise,
        electric: {
          cyan: '#5AD3B8',
          blue: '#37BFA2',
          purple: '#7BE0C8',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Noto Sans Gujarati', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Big Shoulders Display', 'Noto Sans Gujarati', 'Impact', 'sans-serif'],
        mono: ['Manrope', 'Noto Sans Gujarati', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '6px',
        xl: '8px',
        '2xl': '10px',
        '3xl': '14px',
      },
      boxShadow: {
        'glass': '0 12px 32px -12px rgba(0, 0, 0, 0.6)',
        'glow-gold': '0 0 0 1px rgba(200, 243, 29, 0.28)',
        'glow-cyan': '0 0 0 1px rgba(90, 211, 184, 0.25)',
        'glow-emerald': '0 0 0 1px rgba(16, 185, 129, 0.35)',
        'glow-team': '0 0 40px -8px var(--team-color-glow, rgba(200, 243, 29, 0.4))',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'beam': 'beam 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        beam: {
          '0%, 100%': { opacity: '0.2', transform: 'rotate(-15deg) scale(1)' },
          '50%': { opacity: '0.4', transform: 'rotate(-5deg) scale(1.1)' },
        }
      }
    },
  },
  plugins: [],
}
