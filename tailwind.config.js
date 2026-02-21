const theme = require('./constants/theme');

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
          DEFAULT: theme.colors.background,
          100: theme.colors.text,
          200: theme.colors.border,
          300: theme.colors.surfaceAlt,
          800: theme.colors.surface,
          900: theme.colors.background
        },
        accent: {
          500: theme.colors.accent500,
          600: theme.colors.accent600,
          700: theme.colors.accent700
        }

      },
    },
  },
  plugins: [],
}
