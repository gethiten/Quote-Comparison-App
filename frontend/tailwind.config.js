/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1E3A5F', dark: '#0F172A', light: '#2D5282' },
        brand: { blue: '#0284C7', teal: '#0D9488', green: '#059669', amber: '#D97706', red: '#DC2626', purple: '#7C3AED' },
        cell: { green: '#BBF7D0', greenText: '#065F46', amber: '#FDE68A', amberText: '#92400E', red: '#FECACA', redText: '#991B1B' }
      }
    }
  },
  plugins: []
}
