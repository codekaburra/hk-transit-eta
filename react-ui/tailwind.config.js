/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom dark theme colors
        'custom-dark1': '#2D4356',
        'custom-dark2': '#435B66',
        'custom-dark3': '#A76F6F',
        'custom-dark4': '#EAB2A0',
        
        // Custom light theme colors
        'custom-light1': '#FCF8E8',
        'custom-light2': '#D4E2D4',
        'custom-light3': '#ECB390',
        'custom-light4': '#DF7861',
        
        // New warm theme colors
        'warm1': '#65647C',
        'warm2': '#8B7E74',
        'warm3': '#C7BCA1',
        'warm4': '#F1D3B3',
      }
    },
  },
  plugins: [],
}
