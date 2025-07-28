/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'light1': '#ECB176',
        'light2': '#FED8B1',
        'light3': '#6F4E37',
        'light4': '#A67B5B',
        'red1': '#C08261',
        'red2': '#9A3B3B',
        'red3': '#E2C799',
        'red4': '#F2ECBE',
        'custom-light1': '#FFF2E1',
        'custom-light2': '#EAD8C0',
        'custom-light3': '#D1BB9E',
        'custom-light4': '#74512D',
        'custom-light': '#88C999',
        'custom-dark1': '#0F1419',
        'custom-dark2': '#1A202C',
        'custom-dark3': '#2D3748',
        'custom-dark4': '#E2E8F0',
        'warm1': '#8B4513',
        'warm2': '#D2691E',
        'warm3': '#F4A460',
        'warm4': '#FFF8DC',
      }
    },
  },
  plugins: [],
}
