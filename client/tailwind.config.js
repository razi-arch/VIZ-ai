/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tm: {
          orange: '#FF5100',
          flame: '#F37021',
          slate: '#0B132B',
          midnight: '#1C2541',
          elevated: '#222F55',
          card: '#161F37',
          border: '#334155',
          green: '#10B981',
          red: '#EF4444',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
