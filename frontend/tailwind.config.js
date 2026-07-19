/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          950: '#0e0805',
          900: '#1a0f0a',
          800: '#2b1a11',
          700: '#3e271a',
          600: '#523424',
          500: '#694430',
        },
        parchment: {
          50: '#fcfaf2',
          100: '#f5f0db',
          200: '#ebdcb2',
          300: '#deb883',
        },
        noir: {
          950: '#0a0a0c',
          900: '#111115',
          800: '#18181f',
          700: '#24242e',
        },
        crimson: {
          DEFAULT: '#9b1c1c',
          glow: '#e02424',
        }
      },
      fontFamily: {
        typewriter: ['"Courier Prime"', 'Courier', 'monospace'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        lamp: '0 0 40px 10px rgba(253, 224, 71, 0.15)',
        'red-glow': '0 0 10px 2px rgba(239, 68, 68, 0.4)',
        'paper': '2px 2px 10px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
