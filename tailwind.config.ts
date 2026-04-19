import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        dashboard: {
          bg: '#0B1020',
          sidebar: '#0F172A',
          card: '#151E33',
          cardAlt: '#1B2744',
          text: '#EAF2FF',
          muted: '#A7B7D6',
          blue: '#5BC0FF',
          green: '#4ADE80',
          yellow: '#FBBF24',
          red: '#F87171',
        },
        accent: {
          100: '#C7E9FF',
          200: '#8AD3FF',
          300: '#5BC0FF',
          400: '#39B2FF',
          500: '#1E9BFF',
        },
      },
      boxShadow: {
        panel: '0 18px 40px -24px rgba(15, 23, 42, 0.6)',
        dashboard: '0 28px 60px -36px rgba(8, 15, 34, 0.92)',
        glow: '0 0 0 1px rgba(91, 192, 255, 0.08), 0 24px 60px -40px rgba(91, 192, 255, 0.7)',
      },
      fontFamily: {
        display: ['Inter', '"Segoe UI"', 'ui-sans-serif', 'system-ui'],
        body: ['Inter', '"Segoe UI"', 'ui-sans-serif', 'system-ui'],
      },
      backgroundImage: {
        'mesh-glow':
          'radial-gradient(circle at top left, rgba(34, 211, 238, 0.22), transparent 35%), radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.16), transparent 40%)',
      },
    },
  },
  plugins: [],
};

export default config;
