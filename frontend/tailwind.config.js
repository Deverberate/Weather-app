/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        severity: {
          good: "#22c55e",
          moderate: "#eab308",
          unhealthy: "#f97316",
          very_unhealthy: "#ef4444",
          hazardous: "#7c2d12",
        },
      },
    },
  },
  plugins: [],
};
