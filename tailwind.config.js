/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0b1616",
          100: "#d9ebeb", // light text on dark bg
          200: "#1e4747", // borders / subtle lines
          300: "#143434", // surfaces / inputs
          800: "#0e1c1c", // cards
          900: "#0b1616"  // app background
        },
        accent: {
          500: "#2dd4bf",
          600: "#14b8a6",
          700: "#0d9488"
        }

      },
    },
  },
  plugins: [],
}
