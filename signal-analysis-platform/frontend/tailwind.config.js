/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#F5F8FC",
          card: "#FFFFFF",
          sidebar: "#071525",
          sidebarHover: "#0E2238",
          sidebarActive: "#1677FF",
          primary: "#1677FF",
          primaryHover: "#2563EB",
          secondary: "#2563EB",
          success: "#16A34A",
          warning: "#F59E0B",
          error: "#DC2626",
          text: "#0F172A",
          textMuted: "#64748B",
          border: "#E2E8F0"
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        cardHover: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)"
      }
    },
  },
  plugins: [],
}
