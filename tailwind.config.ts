import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./utils/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--accent)",
        background: "var(--background)",
        foreground: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff"
        },
        secondary: {
          DEFAULT: "var(--surface-2)",
          foreground: "var(--text-primary)"
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff"
        },
        muted: {
          DEFAULT: "var(--surface-2)",
          foreground: "var(--text-secondary)"
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff"
        },
        popover: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-primary)"
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-primary)"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      }
    }
  },
  plugins: []
};

export default config;
