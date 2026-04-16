import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-green-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-green-500/20',
    'bg-purple-500/20',
    'bg-blue-500/20',
    'text-green-400',
    'text-purple-400',
    'text-blue-400',
    'bg-green-500/10',
    'bg-purple-500/10',
    'bg-blue-500/10',
    'hover:bg-green-500/10',
    'hover:bg-purple-500/10',
    'hover:bg-blue-500/10',
    'hover:border-green-500/40',
    'hover:border-purple-500/40',
    'hover:border-blue-500/40',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
