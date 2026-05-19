/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4F8C3A',
        'primary-hover': '#3F7330',
        'primary-soft': '#E7F3DD',
        secondary: '#8C6A3F',
        tertiary: '#C97B3F',
        neutral: '#F6F4EC',
        surface: '#FFFFFF',
        'on-surface': '#2A2E26',
        'on-surface-muted': '#6B7166',
        // Override Tailwind's default `border` color so `border-border`
        // resolves to the design.md hairline value.
        border: '#E4E2D6',
        star: '#E2B53C',
        wilted: '#B5703A',
        'wilted-soft': '#F4E5D6',
        success: '#4F8C3A',
        error: '#B0463C',
        // Editorial landing-page palette (additive; doesn't replace anything).
        paper: '#F8F4E8',
        cream: '#EFE8D2',
        ink: '#1F2A22',
        amber: '#E2B53C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        'headline-lg': [
          '28px',
          { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        'headline-md': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-sm': ['16px', { lineHeight: '1.35', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '1.55', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-md': [
          '12px',
          { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' },
        ],
        caption: [
          '11px',
          { lineHeight: '1.3', letterSpacing: '0.01em', fontWeight: '400' },
        ],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        'card-padding': '16px',
        'grid-gutter': '20px',
      },
      borderRadius: {
        none: '0px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.04)',
        modal: '0 12px 32px rgba(0, 0, 0, 0.10)',
      },
    },
  },
  plugins: [],
};
