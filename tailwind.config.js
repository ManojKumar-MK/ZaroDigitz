const GOLD = { 50: '#FDF9EE', 100: '#FAF0D2', 200: '#F3DFA2', 300: '#EAC96E', 400: '#DFB548', 500: '#C9A032', 600: '#A9832A', 700: '#866624', 800: '#6E5323', 900: '#5C4521', 950: '#33250F' };

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Wedding palette. The storefront code (copied from Zaro Crackers) uses orange/amber/
      // yellow utility classes for accents, so those scales are redefined here: orange is
      // maroon and amber/yellow are gold. Change the palette in this one place.
      colors: {
        // Brand colours come from Admin → Settings → Brand colours (src/theme/brand.js).
        primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
        'primary-dark': 'rgb(var(--primary-dark-rgb) / <alpha-value>)',
        secondary: 'rgb(var(--accent-rgb) / <alpha-value>)',
        dark: '#1A0E10',
        bg: '#FBF5EC',
        orange: { 50: '#FBF3F4', 100: '#F6E3E5', 200: '#EBC3C8', 300: '#DA97A0', 400: '#C2626F', 500: '#A23A48', 600: '#8A2A37', 700: '#7A1F2B', 800: '#5F1822', 900: '#4A131B', 950: '#2C0A10' },
        amber: GOLD,
        yellow: GOLD,
        // Theme tokens for the storefront: they switch together in dark mode (src/index.css).
        paper: 'rgb(var(--paper) / <alpha-value>)',
        paper2: 'rgb(var(--paper2) / <alpha-value>)',
        paper3: 'rgb(var(--paper3) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        night: 'rgb(var(--night) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Poppins', 'Inter', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        black: '800',
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'spark': 'spark 1.5s ease-in-out infinite',
        'counter': 'counter 2s ease-out forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        spark: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.3, transform: 'scale(0.8)' },
        }
      }
    },
  },
  plugins: [],
}
