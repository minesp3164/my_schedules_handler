/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        screen: '#F7F7F2',
        surface: '#FFFFFF',
        line: '#DDE5DC',
        lavender: '#52786B',
        muted: '#6F7D75',
        success: '#78A88B',
      },
    },
  },
  plugins: [],
};
