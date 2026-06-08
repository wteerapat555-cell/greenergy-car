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
        "forest-green": "#35654E",
        "moss-green": "#789474",
        "desert-brown": "#A9947A",
        "linen": "#E2E0D8",
        "neutral-gray": "#BCBEC0",
        "dark-text": "#1C1C1C",
      },
      fontFamily: {
        sarabun: ["Sarabun", "sans-serif"],
        "dm-sans": ["DM Sans", "sans-serif"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "1.2" }],
        h1: ["24px", { lineHeight: "1.2" }],
        h2: ["20px", { lineHeight: "1.2" }],
        body: ["16px", { lineHeight: "1.6" }],
        caption: ["13px", { lineHeight: "1.6" }],
      },
    },
  },
  plugins: [],
};

export default config;
