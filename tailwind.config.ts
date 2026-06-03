import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#fafafa",
        card: "#111827",
        border: "#27272a",
        primary: "#f59e0b",
        muted: "#a1a1aa",
        success: "#10b981",
        danger: "#ef4444"
      }
    }
  },
  plugins: []
};

export default config;
