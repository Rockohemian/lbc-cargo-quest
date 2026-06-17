/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lbc: {
          green:        '#1a7e34',
          'green-l':    '#27a349',
          'green-d':    '#0e5a24',
          grey:         '#9EA3A5',
          'grey-d':     '#6a7070',
          blue:         '#2a8ae0',
        },
        surface: {
          900: '#08100a',
          800: '#101810',
          700: '#18261a',
          600: '#20301f',
          500: '#2a3e28',
        },
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.02) 100%)',
        'lbc-g': 'linear-gradient(135deg,#0e5a24 0%,#1a7e34 60%,#27a349 100%)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        float:        'float 3s ease-in-out infinite',
        'spin-slow':  'spin 5s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 18px rgba(26,126,52,.3)' },
          '50%':     { boxShadow: '0 0 40px rgba(26,126,52,.7)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
