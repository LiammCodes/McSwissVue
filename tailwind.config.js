/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  mode: 'jit',
  daisyui: {
    themes: ["dark", "light", "aqua", "cupcake", "dracula", "forest", "lofi", "night", "synthwave", "winter"],
  },
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
}

