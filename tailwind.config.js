/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        tavern: "var(--panel-shadow)",
        glow: "0 0 24px rgba(245, 178, 77, 0.28)"
      }
    }
  },
  plugins: []
};
