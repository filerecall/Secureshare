import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand primary - the indigo/violet used for app-wide CTAs,
        // accents, focus rings. Sourced from the FileRecall brand spec.
        brand: {
          DEFAULT: "#5B5BD6",
          hover: "#4747C7", // ~10% darker for press/hover
          soft: "#EEEEFB", // very light tint for backgrounds
          ring: "#A5A8EE", // mid lightness for focus rings
        },
        // Reserved exclusively for the "Get started" CTA pill in the
        // marketing site header - matches the blue "Start Free Trial"
        // button on filerecall.com. Do not use for other buttons.
        "cta-blue": {
          DEFAULT: "#467FF7",
          hover: "#2563EB",
        },
      },
      backgroundImage: {
        // Multi-stop diagonal gradient used on hero / stats / CTA blocks.
        // Mirrors the "To Launch Your Business" section on filerecall.com:
        // deep violet -> light lavender -> warm peach in the top-right.
        "brand-gradient":
          "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 35%, #C4B5FD 70%, #FDE6D3 100%)",
        // Subtle text gradient for highlighted spans in headings.
        "brand-text-gradient":
          "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 60%, #C4B5FD 100%)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translate(-50%, 10px)" },
          "100%": { opacity: "1", transform: "translate(-50%, 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
