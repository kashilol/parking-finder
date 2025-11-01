/** @type {import('@tailwindcss/postcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1D4ED8', // Blue-700 for buttons
        secondary: '#6B7280', // Gray-500 for admin button
        accent: '#22C55E', // Green-500 for submit
        danger: '#EF4444', // Red-500 for delete
      }
    }
  },
  plugins: []
};