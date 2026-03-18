import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background:        "#08090B",
        surface:           "#0E1014",
        "surface-2":       "#141519",
        "surface-3":       "#0A0B0D",
        border:            "#1C2028",
        "border-light":    "#2A3040",
        primary:           "#22C55E",
        "primary-light":   "#4ADE80",
        "primary-dark":    "#16A34A",
        "primary-glow":    "rgba(34, 197, 94, 0.15)",
        "accent-cyan":     "#22D3EE",
        "text-muted":      "#8B929F",
        "text-secondary":  "#596270",
        "text-dim":        "#3D4452",
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "hero":     ["clamp(3.25rem, 8.5vw, 7.5rem)", { lineHeight: "0.93", letterSpacing: "-0.04em", fontWeight: "900" }],
        "hero-sub": ["clamp(1rem, 2vw, 1.25rem)",     { lineHeight: "1.7" }],
        "section":  ["clamp(2.25rem, 5vw, 3.5rem)",   { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "900" }],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        DEFAULT: "12px",
        lg: "20px",
        xl: "28px",
      },
      animation: {
        "pulse-slow":  "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow":   "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "flow-1":      "flow 4s linear infinite",
        "flow-2":      "flow 6s linear infinite",
        "flow-3":      "flow 5s linear infinite",
        "glow":        "glow 2.5s ease-in-out infinite alternate",
        "float":       "float 7s ease-in-out infinite",
        "scan":        "scan 3s linear infinite",
        "shimmer":     "shimmer 2.5s linear infinite",
        "gradient":    "gradientShift 5s ease infinite",
        "fade-in-up":  "fadeInUp 0.7s ease forwards",
        "progress":    "progressBar 1.2s ease-out forwards",
      },
      keyframes: {
        flow: {
          "0%":   { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        glow: {
          "0%":   { boxShadow: "0 0 20px rgba(34, 197, 94, 0.2), 0 0 40px rgba(34, 197, 94, 0.05)" },
          "100%": { boxShadow: "0 0 40px rgba(34, 197, 94, 0.5), 0 0 80px rgba(34, 197, 94, 0.1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        scan: {
          "0%":   { transform: "translateY(-100%)", opacity: "0" },
          "50%":  { opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        gradientShift: {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        progressBar: {
          from: { width: "0%" },
          to:   { width: "var(--bar-width, 60%)" },
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(34, 197, 94, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.04) 1px, transparent 1px)",
        "gradient-green-cyan": "linear-gradient(135deg, #22C55E 0%, #22D3EE 100%)",
        "gradient-btn": "linear-gradient(135deg, #22C55E 0%, #4ADE80 50%, #22C55E 100%)",
      },
      backgroundSize: {
        "grid":   "64px 64px",
        "200pct": "200% auto",
      },
      boxShadow: {
        "green-sm":  "0 0 12px rgba(34, 197, 94, 0.2)",
        "green-md":  "0 0 30px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.08)",
        "green-lg":  "0 0 50px rgba(34, 197, 94, 0.5), 0 0 100px rgba(34, 197, 94, 0.12)",
        "card":      "0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset",
        "card-hover":"0 24px 60px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
      },
      dropShadow: {
        "green": "0 0 20px rgba(34, 197, 94, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
