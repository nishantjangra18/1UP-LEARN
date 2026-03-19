/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Kid-friendly vibrant palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        game: {
          purple: '#7c3aed',
          pink: '#ec4899',
          orange: '#f97316',
          yellow: '#eab308',
          green: '#22c55e',
          teal: '#14b8a6',
        },
      },
      fontFamily: {
        game: ['"Fredoka One"', 'cursive'],
        body: ['"Nunito"', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        wiggle: 'wiggle 0.5s ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
        float: 'float 3s ease-in-out infinite',
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
