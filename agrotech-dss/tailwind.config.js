/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Barlow Condensed"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Paleta "canopy"
        canopy: {
          50: "#f7faf4",
          100: "#eaf1e1",
          200: "#d3e3c0",
          300: "#a9c985",
          400: "#79a84a",
          500: "#4f7f26",
          600: "#3f6a1c",
          700: "#325416",
          800: "#1f3d10",
          900: "#14290a",
          950: "#04140a",
        },
        gold: {
          300: "#e8e4a0",
          400: "#dcd88a",
          500: "#c9c46a",
        },
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(220, 216, 138, 0.25)",
        soft: "0 20px 50px -20px rgba(31, 61, 16, 0.35)",
      },
    },
  },
  plugins: [],
};
