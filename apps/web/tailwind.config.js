/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      keyframes: {
        'loader-bar': {
          '0%':   { transform: 'translateX(-100%)' },
          '50%':  { transform: 'translateX(-20%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'loader-bar': 'loader-bar 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
