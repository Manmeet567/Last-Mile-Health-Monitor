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
        accent: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
        },
      },
      boxShadow: {
        panel: '0 18px 40px -24px rgba(15, 23, 42, 0.6)',
      },
      fontFamily: {
        display: ['"Aptos Display"', '"Segoe UI"', 'ui-sans-serif', 'system-ui'],
        body: ['Aptos', '"Segoe UI"', 'ui-sans-serif', 'system-ui'],
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
