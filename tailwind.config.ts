import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { ink: "#202522", paper: "#f4f4ef", forest: "#315b4e" } } }, plugins: [] };
export default config;
