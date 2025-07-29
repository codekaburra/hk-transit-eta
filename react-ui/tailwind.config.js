/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'red1': '#F2ECBE',  // Lightest
        'red2': '#E2C799',
        'red3': '#C08261',
        'red4': '#9A3B3B',  // Darkest
        
        'light1': '#FFF2E1',  // Lightest
        'light2': '#EAD8C0',
        'light3': '#D1BB9E',
        'light4': '#74512D',  // Darkest
        
        'dark1': '#abafb5',  // Lightest
        'dark2': '#424b5a',
        'dark3': '#1A202C',
        'dark4': '#0F1419',  // Darkest
        
        'warm1': '#FFF8DC',  // Lightest
        'warm2': '#F4A460',
        'warm3': '#D2691E',
        'warm4': '#8B4513',  // Darkest
      }
    },
  },
  plugins: [],
}
