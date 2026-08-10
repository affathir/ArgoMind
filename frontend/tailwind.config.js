/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AgriMind brand palette
        brand: {
          green:  "#16a34a",  // primary – healthy/ok state
          yellow: "#ca8a04",  // warning state
          red:    "#dc2626",  // critical / alert state
          blue:   "#2563eb",  // accent / info
          soil:   "#92400e",  // thematic earth tone
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      animation: {
        pulse_slow: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
