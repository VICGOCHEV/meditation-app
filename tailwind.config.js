/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#0a0714',
          1: '#110c20',
          2: '#1a1330',
          3: '#231a42',
        },
        fg: {
          0: '#f4f0ff',
          1: '#d9d2f0',
          2: '#a99ecb',
          3: '#6e6290',
          4: '#463e62',
        },
        line: {
          DEFAULT: 'rgba(180,160,255,0.09)',
          2: 'rgba(180,160,255,0.16)',
        },
        violet: { DEFAULT: '#6145c2' },
        indigo: { DEFAULT: 'oklch(0.60 0.17 278)' },
        lilac: { DEFAULT: 'oklch(0.78 0.12 312)' },
        ember: { DEFAULT: 'oklch(0.78 0.14 60)' },
        ok: 'oklch(0.72 0.13 160)',
        warn: 'oklch(0.78 0.14 60)',
        err: 'oklch(0.66 0.18 20)',
      },
      fontFamily: {
        sans: ["'Manrope'", 'system-ui', 'sans-serif'],
        serif: ["'Manrope'", 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
        display: ["'Manrope'", 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '16px',
        lg: '22px',
        xl: '32px',
      },
      boxShadow: {
        'shadow-1': '0 1px 2px rgba(0,0,0,.5)',
        'shadow-2': '0 10px 40px -12px rgba(70,40,150,.55)',
        glow: '0 0 60px -10px oklch(0.66 0.18 300 / 0.55)',
        'btn-primary':
          '0 10px 30px -10px oklch(0.55 0.22 295 / 0.6), inset 0 1px 0 rgba(255,255,255,.2)',
      },
      backgroundImage: {
        'primary-btn':
          'linear-gradient(180deg, oklch(0.62 0.19 300), oklch(0.52 0.20 288))',
        'night-sky':
          'radial-gradient(900px 600px at 85% -200px, oklch(0.35 0.18 290 / 0.45), transparent 60%), radial-gradient(700px 500px at -200px 40%, oklch(0.30 0.16 270 / 0.35), transparent 60%), #0a0714',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
