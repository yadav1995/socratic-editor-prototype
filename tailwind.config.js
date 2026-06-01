/** Tailwind config — Architecture §7 / §9 (compiled build optional) */
module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        paradox: {
          DEFAULT: '#d97706',
          50: '#fffbeb',
          200: '#fde68a',
          300: '#fcd34d',
          600: '#d97706',
        },
      },
      borderRadius: {
        device: '2.5rem',
      },
    },
  },
  safelist: [
    'bg-amber-50',
    'text-amber-600',
    'border-amber-200',
    'border-amber-300',
    'border-dashed',
  ],
};
