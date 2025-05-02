/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // We can add custom colors here later based on the design system
      },
      fontFamily: {
        // We can add custom fonts here later
      },
    },
  },
  plugins: [],
}