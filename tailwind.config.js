/** @type {import('tailwindcss').Config} */

// Design tokens live as CSS variables in src/index.css (light on :root,
// dark on .dark). Channel-style vars ("R G B") keep Tailwind's /opacity
// modifiers working, e.g. bg-hx-accent/10.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        hx: {
          bg: token("bg"),
          card: token("card"),
          text: token("text"),
          text2: token("text2"),
          border: token("border"),
          input: token("input"),
          btn: token("btn"),
          btnh: token("btnh"),
          accent: token("accent"),
          hover: "var(--hover)",
          "accent-soft": "var(--accent-soft)",
        },
        // Legacy palette used by older screens (auth, admin, modals). Mapped
        // onto the same tokens so light/dark stay consistent everywhere.
        fb: {
          blue: token("accent"),
          "blue-dark": "#166FE5",
          green: "#42B72A",
          bg: token("bg"),
          "bg-dark": token("bg"),
          card: token("card"),
          "card-dark": token("card"),
          text: token("text"),
          "text-dark": token("text"),
          muted: token("text2"),
          "muted-dark": token("text2"),
          border: token("border"),
          "border-dark": token("border"),
        },
      },
      boxShadow: {
        hx: "0 1px 2px var(--shadow)",
        "hx-pop": "var(--pop)",
      },
      keyframes: {
        hxPop: { from: { opacity: 0, transform: "translateY(-6px) scale(.98)" }, to: { opacity: 1, transform: "none" } },
        hxRise: { from: { opacity: 0, transform: "translateY(8px) scale(.9)" }, to: { opacity: 1, transform: "none" } },
        hxFade: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        "hx-pop": "hxPop .16s ease",
        "hx-rise": "hxRise .2s ease",
        "hx-fade": "hxFade .2s ease",
      },
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "-apple-system", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
