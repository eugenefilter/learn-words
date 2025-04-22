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
          100: "#f6f6f6",
          200: "#e0e0e0",
          300: "#828282",
          900: "#252525"
        },

      },
    },
  },
  plugins: [],
}