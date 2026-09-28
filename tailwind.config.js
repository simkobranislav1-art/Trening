const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        card: c('card'),
        card2: c('card2'),
        line: c('line'),
        ink: c('ink'),
        muted: c('muted'),
        accent: c('accent'),
        good: c('good'),
        warn: c('warn'),
        danger: c('danger'),
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem' },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
