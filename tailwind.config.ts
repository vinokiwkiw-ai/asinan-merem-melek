import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/layouts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        amm: {
          mangoGreen: '#8BC137',
          cream: '#FFF8E8',
          deepGreen: '#183F2E',
          deepGreenDark: '#0C251B',
          freshYellow: '#FFD83D',
          coralRed: '#FF5954',
        },
        brand: {
          surface: '#072a1d',
          emerald: '#0b3826',
          dark: '#10462f',
          mint: '#8BC137',
          mintLight: '#B7E4C7',
          gold: '#FFD83D',
          coral: '#FF5954',
          whatsapp: '#25D366',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
        'float': 'float 4s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'mango-breathe': 'mangoBreathe 3s ease-in-out infinite',
        'mango-jump': 'mangoJump 0.6s ease-in-out infinite alternate',
        'mango-wobble': 'mangoWobble 0.8s ease-in-out infinite alternate',
        'mango-scooter': 'mangoScooter 0.5s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        mangoBreathe: {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.02, 0.98) translateY(1px)' },
        },
        mangoJump: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-14px) scale(1.04, 0.96)' },
        },
        mangoWobble: {
          '0%': { transform: 'rotate(-5deg) translateY(0)' },
          '100%': { transform: 'rotate(5deg) translateY(-4px)' },
        },
        mangoScooter: {
          '0%': { transform: 'translateY(0) skewX(-2deg)' },
          '100%': { transform: 'translateY(-3px) skewX(2deg)' },
        },
      }
    },
  },
  plugins: [],
};
export default config;
