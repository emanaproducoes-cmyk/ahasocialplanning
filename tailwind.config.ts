import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF5C00',
          hover:   '#E54E00',
          light:   '#FF7A2E',
        },
        secondary: {
          DEFAULT: '#FFB800',
        },
        accent: {
          DEFAULT: '#7C3AED',
        },
        sidebar: {
          bg:     '#1A1A2E',
          text:   '#A0A0B8',
          active: '#FF5C00',
          hover:  'rgba(255,92,0,0.08)',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          2:       '#F8F7FF',
        },
        status: {
          success: '#22C55E',
          danger:  '#EF4444',
          warning: '#F59E0B',
          info:    '#3B82F6',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'Inter', 'sans-serif'],
        display: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-aha':      'linear-gradient(135deg, #FF5C00 0%, #FF8C00 50%, #FFB800 100%)',
        'gradient-ig':       'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #F77737 100%)',
        'gradient-fb':       'linear-gradient(135deg, #1877F2 0%, #0C5FD6 100%)',
        'gradient-yt':       'linear-gradient(135deg, #FF0000 0%, #FF6B00 100%)',
        'gradient-tiktok':   'linear-gradient(135deg, #010101 0%, #2E2E2E 100%)',
        'gradient-linkedin': 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        hover: '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg:      '12px',
        xl:      '16px',
        '2xl':   '20px',
      },
      animation: {
        shimmer:  'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-badge': 'pulseBadge 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%':    { backgroundPosition: '-200px 0' },
          '100%':  { backgroundPosition: 'calc(200px + 100%) 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseBadge: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':      { transform: 'scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
