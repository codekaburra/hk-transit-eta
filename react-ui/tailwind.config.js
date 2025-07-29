/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 'light1': '#ECB176',
        // 'light2': '#FED8B1',
        // 'light3': '#6F4E37',
        // 'light4': '#A67B5B',
        'red1': '#C08261',
        'red2': '#9A3B3B',
        'red3': '#E2C799',
        'red4': '#F2ECBE',
        'light1': '#FFF2E1',
        'light2': '#EAD8C0',
        'light3': '#D1BB9E',
        'light4': '#74512D',
        'light': '#88C999',
        'dark1': '#0F1419',
        'dark2': '#1A202C',
        'dark3': '#424b5a',
        'dark4': '#abafb5',
        'warm1': '#8B4513',
        'warm2': '#D2691E',
        'warm3': '#F4A460',
        'warm4': '#FFF8DC',
      }
    },
  },
  plugins: [],
}
