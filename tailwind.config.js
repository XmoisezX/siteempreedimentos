/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        imperio: {
          blue: {
            900: '#0F265C', // Azul profundo premium
            800: '#183675',
            700: '#1F4799',
          },
          gold: {
            500: '#D4AF37', // Dourado premium
            400: '#E5C158',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
