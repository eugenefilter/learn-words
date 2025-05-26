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
          DEFAULT: "#fff", //"#202020",
          100: "#d9ebeb",
          200: "#e0e0e0",
          300: "#042a2b",
          800: "#052020",
          900: "#041616"
        },

      },
    },
  },
  plugins: [],
}