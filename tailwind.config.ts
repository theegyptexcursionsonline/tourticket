import type { Config } from "tailwindcss";
import scrollbarHide from "tailwind-scrollbar-hide"; // Import the plugin

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)"],
        mono: ["var(--font-almarai)"],
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [scrollbarHide], // Add the plugin here
};
export default config;