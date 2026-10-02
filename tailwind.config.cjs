module.exports = {
  darkMode: 'class',
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['Fira Code', 'monospace']
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca'
        }
      }
    }
  },
  plugins: []
};