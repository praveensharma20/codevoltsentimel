/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B0F17',
          800: '#111827',
          700: '#1F2937',
          600: '#374151'
        },
        cyber: {
          blue: '#00F0FF',
          purple: '#7000FF',
          green: '#00FF66',
          red: '#FF0055'
        }
      }
    },
  },
  plugins: [],
}