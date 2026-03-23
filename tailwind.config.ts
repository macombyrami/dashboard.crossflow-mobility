import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     '#08090B',
          surface:  '#0F1014',
          elevated: '#18191E',
          border:   '#22252C',
          subtle:   '#2A2D36',
        },
        apple: {
          blue:    '#007AFF',
          green:   '#34C759',
          orange:  '#FF9F0A',
          red:     '#FF3B30',
          yellow:  '#FFD600',
          gray:    '#86868B',
          graphite:'#1C1C1E',
        },
        text: {
          primary:   '#F5F5F7',
          secondary: '#86868B',
          muted:     '#424245',
          inverse:   '#08090B',
        },
        brand: {
          green:     '#22C55E',
          'green-dim': 'rgba(34, 197, 94, 0.12)',
          'green-hover': '#4ADE80',
        },
        traffic: {
          free:      '#22C55E',
          slow:      '#FFD600',
          congested: '#FF9F0A',
          critical:  '#FF3B30',
        },
      },
      fontFamily: {
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        apple:   '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glass:   '0 4px 24px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        glow:    '0 0 20px rgba(34, 197, 94, 0.3)',
      },
      borderRadius: {
        apple:   '18px',
        panel:   '24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up':   'slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(12px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}

export default config
