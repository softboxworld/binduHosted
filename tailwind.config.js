/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '380px',
      },
      colors: {
        // Light mode colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Dark mode specific colors
        dark: {
          bg: {
            primary: '#111827',    // gray-900
            secondary: '#1f2937',  // gray-800
            tertiary: '#374151',   // gray-700
          },
          text: {
            primary: '#f9fafb',    // gray-50
            secondary: '#e5e7eb',  // gray-200
            tertiary: '#9ca3af',   // gray-400
          },
          border: {
            primary: '#374151',    // gray-700
            secondary: '#4b5563',  // gray-600
          },
          accent: {
            primary: '#3b82f6',    // blue-500
            secondary: '#60a5fa',  // blue-400
          }
        }
      }
    },
  },
  plugins: [],
}
