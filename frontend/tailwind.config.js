/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0EDFA',
          100: '#DED8F5',
          200: '#BDB1EB',
          300: '#9C8AE1',
          400: '#7B63D7',
          500: '#513CC8',
          600: '#4430B8',
          700: '#3726A0',
          800: '#2A1C88',
          900: '#1D1270',
        }
      }
    },
  },
  plugins: [],
}
