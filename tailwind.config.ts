import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'nf': '0 18px 50px -36px rgba(0,0,0,.9)',
        'nf-lg': '0 28px 80px -40px rgba(0,0,0,.95)',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        neyguichen: {
          primary: '#6366f1',
          secondary: '#22d3ee',
          accent: '#34d399',
          neutral: '#111827',
          'base-100': '#08111f',
          'base-200': '#0b1627',
          'base-300': '#132238',
          'base-content': '#f8fafc',
          info: '#38bdf8',
          success: '#34d399',
          warning: '#fbbf24',
          error: '#fb7185',
        },
      },
    ],
  },
};
export default config;
