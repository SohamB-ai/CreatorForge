export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        mahogany: '#1C1714',
        'aged-oak': '#251E19',
        parchment: '#E8DFD4',
        'worn-leather': '#3D332B',
        'faded-ink': '#9C8B7A',
        'wood-grain': '#4A3F35',
        brass: {
          light: '#D4B872',
          DEFAULT: '#C9A962',
          dark: '#B8953F',
        },
        crimson: {
          DEFAULT: '#8B2635',
          dark: '#681B27',
        },
        brand: {
          50: '#FAF6F0',
          100: '#F4ECE0',
          200: '#E8DFD4',
          300: '#D4B872',
          400: '#C9A962',
          500: '#C9A962',
          600: '#B8953F',
          700: '#8B2635',
          800: '#4A3F35',
          900: '#251E19',
          950: '#1C1714',
        },
      },
      fontFamily: {
        heading: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Crimson Pro"', 'Georgia', 'serif'],
        display: ['Cinzel', 'Trajan Pro', 'serif'],
        serif: ['"Crimson Pro"', 'Georgia', 'serif'],
      },
      borderRadius: {
        arch: '40% 40% 0 0 / 20% 20% 0 0',
      },
      animation: {
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'shimmer-slide': 'shimmer-slide var(--speed, 3s) ease-in-out infinite alternate',
        'spin-around': 'spin-around calc(var(--speed, 3s) * 2) infinite linear',
      },
      keyframes: {
        'border-beam': {
          '100%': {
            'offset-distance': '100%',
          },
        },
        'shimmer-slide': {
          to: {
            transform: 'translate(calc(100cqw - 100%), 0)',
          },
        },
        'spin-around': {
          '0%': {
            transform: 'translateZ(0) rotate(0)',
          },
          '15%, 35%': {
            transform: 'translateZ(0) rotate(90deg)',
          },
          '65%, 85%': {
            transform: 'translateZ(0) rotate(270deg)',
          },
          '100%': {
            transform: 'translateZ(0) rotate(360deg)',
          },
        },
      },
    },
  },
  plugins: [],
};
