/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  mode: 'jit',
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
}

