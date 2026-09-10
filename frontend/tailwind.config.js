/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        screen: '#F5FAFF',
        surface: '#FFFFFF',
        line: '#D8E7F5',
        lavender: '#2479CC',
        muted: '#69809D',
        success: '#31B9BD',
      },
    },
  },
  plugins: [],
};
