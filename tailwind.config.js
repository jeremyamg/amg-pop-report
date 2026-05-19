/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    fontFamily: {
      "theme-font-extra-bold": ["Neue Haas Grotesk Display Pro", "sans-serif"],
      "theme-font-bold": ["Neue Haas Grotesk Display Pro", "sans-serif"],
      "theme-font-light": ["Neue Haas Grotesk Display Pro", "sans-serif"],
      "theme-font-thin": ["Neue Haas Grotesk Display Pro", "sans-serif"],
      "theme-font-medium": ["Neue Haas Grotesk Display Pro", "sans-serif"],
      "theme-font-roman": ["Neue Haas Grotesk Display Pro", "sans-serif"],
      "theme-font-light-italic": ["Neue Haas Grotesk Display Pro", "sans-serif"],
    },
    extend: {
      colors: {
        white: "#F8F7F3",
        "container-bg": "#F8F7F3",
        "theme-gray": "#EBEAE2",
        "theme-black": "#100F0F",
      },
    },
  },
  plugins: [],
}
