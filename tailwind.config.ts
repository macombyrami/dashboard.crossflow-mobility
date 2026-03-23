import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     '#07070D',
          surface:  '#0F0F1A',
          elevated: '#161625',
          border:   '#1E1E30',
          subtle:   '#252538',
        },
        text: {
          primary:   '#F0F0FF',
          secondary: '#8080A0',
          muted:     '#454560',
          inverse:   '#07070D',
        },
        brand: {
          green:     '#00E676',
          'green-dim': 'rgba(0,230,118,0.12)',
          'green-hover': '#00FF84',
        },
        traffic: {
          free:      '#00E676',
          slow:      '#FFD600',
          congested: '#FF6D00',
          critical:  '#FF1744',
        },
        severity: {
          low:      '#00E676',
          medium:   '#FFD600',
          high:     '#FF6D00',
          critical: '#FF1744',
          info:     '#2979FF',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        panel:   '0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        glow:    '0 0 24px rgba(0,230,118,0.2)',
        critical:'0 0 16px rgba(255,23,68,0.3)',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.2s ease',
        'slide-in':   'slideIn 0.3s ease',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}

export default config
