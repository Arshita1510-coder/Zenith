/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        mint: "#3fb984",
        coral: "#ec6b5f"
      }
    }
  },
  plugins: []
};
