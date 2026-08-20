/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "sans-serif"],
      },
      colors: {
        ink: "#1E2933",
        slate: "#3E5C6B",
        paper: "#F6F5F1",
        line: "#DCD8CE",
        accent: "#2F6F4E",   // βαθύ πράσινο "πίνακα"
        accentSoft: "#E4EFE7",
        warn: "#B4472B",
      },
    },
  },
  plugins: [],
};
