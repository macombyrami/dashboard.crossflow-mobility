import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Apple Graphite Dark
        bg: {
          base:     '#08090B',
          surface:  '#0F1014',
          elevated: '#18191E',
          border:   '#22252C',
          subtle:   '#2A2D36',
          hover:    '#32353F',
        },
        text: {
          primary:   '#F5F5F7',
          secondary: '#86868B',
          muted:     '#424245',
          accent:    '#FFFFFF',
        },
        brand: {
          DEFAULT: '#10a854',
          dim:     'rgba(16, 168, 84, 0.15)',
          glow:    'rgba(16, 168, 84, 0.25)',
        },
        traffic: {
          free:      '#10a854',
          slow:      '#FFD600',
          congested: '#FF9F0A',
          critical:  '#FF3B30',
        },
        // Apple system colors
        apple: {
          blue:   '#0A84FF',
          indigo: '#5E5CE6',
          purple: '#BF5AF2',
          pink:   '#FF375F',
          red:    '#FF3B30',
          orange: '#FF9F0A',
          yellow: '#FFD60A',
          green:  '#32D74B',
          teal:   '#5AC8F5',
          cyan:   '#5AC8FA',
        },
      },
      fontFamily: {
        sans:  ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono:  ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.01em' }],
        xs:    ['11px', { lineHeight: '16px', letterSpacing: '0.005em' }],
        sm:    ['13px', { lineHeight: '18px', letterSpacing: '-0.005em' }],
        base:  ['15px', { lineHeight: '22px', letterSpacing: '-0.011em' }],
        lg:    ['17px', { lineHeight: '24px', letterSpacing: '-0.014em' }],
        xl:    ['20px', { lineHeight: '28px', letterSpacing: '-0.017em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.019em' }],
        '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.021em' }],
        '4xl': ['34px', { lineHeight: '42px', letterSpacing: '-0.022em' }],
      },
      borderRadius: {
        none:  '0',
        sm:    '6px',
        DEFAULT: '10px',
        md:    '12px',
        lg:    '16px',
        xl:    '20px',
        '2xl': '24px',
        '3xl': '32px',
        full:  '9999px',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
      boxShadow: {
        glass:  '0 8px 32px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        card:   '0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        glow:   '0 0 20px rgba(16,168,84,0.3)',
        'glow-sm': '0 0 10px rgba(16,168,84,0.2)',
        float:  '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '40px',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      animation: {
        'fade-in':    'fade-in 0.2s ease-out',
        'slide-up':   'slide-up 0.3s cubic-bezier(0.4,0,0.2,1)',
        'slide-down': 'slide-down 0.3s cubic-bezier(0.4,0,0.2,1)',
        'slide-left': 'slide-left 0.3s cubic-bezier(0.4,0,0.2,1)',
        'scale-in':   'scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        'fade-in':    { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up':   { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'slide-down': { from: { transform: 'translateY(-8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'slide-left': { from: { transform: 'translateX(8px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        'scale-in':   { from: { transform: 'scale(0.92)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 8px rgba(16,168,84,0.2)' },
          '50%':     { boxShadow: '0 0 20px rgba(16,168,84,0.5)' },
        },
      },
      screens: {
        xs:  '375px',
        sm:  '640px',
        md:  '768px',
        lg:  '1024px',
        xl:  '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}

export default config
