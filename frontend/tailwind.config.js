/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Soothing ink palette — warmer + less harsh than pure slate
        ink: {
          950: '#0a0f1c',
          900: '#0f1525',
          850: '#131a2d',
          800: '#1a2238',
          700: '#232c46',
          600: '#2c3656',
          500: '#3a466a',
          400: '#6a7696',
          300: '#9aa4c1',
          200: '#c3cadf',
          100: '#e4e8f4',
        },
        brand: {
          50:  '#eef9ff',
          100: '#d8f0ff',
          200: '#b4e2ff',
          300: '#83ceff',
          400: '#4ab3ff',
          500: '#2b9bff',
          600: '#1a7ce6',
          700: '#1863b8',
          800: '#1a5391',
          900: '#1b4576',
        },
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '"Inter"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI Variable"',
          'Segoe UI',
          'sans-serif',
        ],
        display: [
          '"Geist"',
          '"Plus Jakarta Sans"',
          '"Inter"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      letterSpacing: {
        tightish: '-0.015em',
        tighter2: '-0.035em',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(74,179,255,0.22), 0 12px 30px -14px rgba(74,179,255,0.35)',
        soft: '0 10px 40px -15px rgba(10,15,28,0.7)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        'aurora':
          'radial-gradient(1200px 600px at 10% -10%, rgba(74,179,255,0.18), transparent 60%),' +
          'radial-gradient(900px 500px at 110% 10%, rgba(167,139,250,0.14), transparent 55%),' +
          'radial-gradient(700px 500px at 50% 120%, rgba(45,212,191,0.10), transparent 60%)',
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '42px 42px',
      },
      animation: {
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
        float: 'float 9s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
      },
      keyframes: {
        pulseSoft: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '.55' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
