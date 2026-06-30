/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red:      '#E31837',
          darkred:  '#B01229',
          lightred: '#FF4D6A',
          crimson:  '#C0152F',
          white:    '#FFFFFF',
          offwhite: '#FFF5F6',
          gray:     '#F5F5F5',
          darkgray: '#1A1A1A',
          midgray:  '#4A4A4A',
          border:   '#E8E8E8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 2px 16px 0 rgba(227,24,55,0.10)',
        'brand-lg': '0 4px 32px 0 rgba(227,24,55,0.15)',
      },
    },
  },
  plugins: [],
}
