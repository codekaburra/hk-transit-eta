/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        custom: {
          dark1: '#2D4356',  // Darkest blue-gray
          dark2: '#435B66',  // Medium blue-gray
          dark3: '#A76F6F',  // Muted red-brown
          dark4: '#EAB2A0',  // Light peach
          light1: '#FCF8E8', // Cream white
          light2: '#D4E2D4', // Sage green
          light3: '#ECB390', // Warm orange
          light4: '#DF7861', // Coral red
        }
      }
    },
  },
  plugins: [],
}
