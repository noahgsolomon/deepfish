import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";

const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
        "3xl": "1800px",
        "4xl": "2000px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["JetBrains Mono"],
      },

      borderRadius: {
        lg: "0",
        md: "0",
        sm: "0",
      },
      boxShadow: {
        terminal: "0 0 0 2px hsl(0 0% 98%)",
      },
      keyframes: {
        "rainbow-border": {
          "0%": { borderColor: "rgba(255, 0, 0, 0.7)" },
          "14%": { borderColor: "rgba(255, 127, 0, 0.7)" },
          "28%": { borderColor: "rgba(255, 255, 0, 0.7)" },
          "42%": { borderColor: "rgba(0, 255, 0, 0.7)" },
          "56%": { borderColor: "rgba(0, 0, 255, 0.7)" },
          "70%": { borderColor: "rgba(75, 0, 130, 0.7)" },
          "84%": { borderColor: "rgba(148, 0, 211, 0.7)" },
          "100%": { borderColor: "rgba(255, 0, 0, 0.7)" },
        },
        "pulse-border": {
          "0%": { borderColor: "rgba(255, 255, 255, 0.3)" },
          "50%": { borderColor: "rgba(255, 255, 255, 0.9)" },
          "100%": { borderColor: "rgba(255, 255, 255, 0.3)" },
        },
        "terminal-cursor": {
          "0%": { opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "rainbow-border": "rainbow-border 10s linear infinite",
        "pulse-border": "pulse-border 2s ease-in-out infinite",
        "terminal-cursor": "terminal-cursor 1s infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
