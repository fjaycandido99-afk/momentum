/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
      },
      // Text scales with the iPhone's text size: --ts is set on <html> from
      // -apple-system-body (app/layout.tsx), 1 by default, 0.85–1.5. Only TEXT
      // scales, and big type less (as iOS does): ≤20px takes the full extra size,
      // ≤28px 60%, ≤40px 40%, display sizes 25% — a 48px headline at 1.4× would
      // otherwise not fit one word across a phone.
      // scales — spacing and layout stay put, so nothing is pushed off-screen.
      // text-px-N replaces text-[Npx], which could not scale.
      fontSize: {
        'xs': ['calc(0.75rem * var(--ts, 1))', { lineHeight: '1.3333' }],
        'sm': ['calc(0.875rem * var(--ts, 1))', { lineHeight: '1.4286' }],
        'base': ['calc(1rem * var(--ts, 1))', { lineHeight: '1.5' }],
        'lg': ['calc(1.125rem * var(--ts, 1))', { lineHeight: '1.5556' }],
        'xl': ['calc(1.25rem * var(--ts, 1))', { lineHeight: '1.4' }],
        '2xl': ['calc(1.5rem * (1 + (var(--ts, 1) - 1) * 0.6))', { lineHeight: '1.3333' }],
        '3xl': ['calc(1.875rem * (1 + (var(--ts, 1) - 1) * 0.4))', { lineHeight: '1.2' }],
        '4xl': ['calc(2.25rem * (1 + (var(--ts, 1) - 1) * 0.4))', { lineHeight: '1.1111' }],
        '5xl': ['calc(3rem * (1 + (var(--ts, 1) - 1) * 0.25))', { lineHeight: '1' }],
        '6xl': ['calc(3.75rem * (1 + (var(--ts, 1) - 1) * 0.25))', { lineHeight: '1' }],
        '7xl': ['calc(4.5rem * (1 + (var(--ts, 1) - 1) * 0.25))', { lineHeight: '1' }],
        '8xl': ['calc(6rem * (1 + (var(--ts, 1) - 1) * 0.25))', { lineHeight: '1' }],
        '9xl': ['calc(8rem * (1 + (var(--ts, 1) - 1) * 0.25))', { lineHeight: '1' }],
        'px-7': 'calc(7px * var(--ts, 1))',
        'px-8': 'calc(8px * var(--ts, 1))',
        'px-9': 'calc(9px * var(--ts, 1))',
        'px-10': 'calc(10px * var(--ts, 1))',
        'px-10.5': 'calc(10.5px * var(--ts, 1))',
        'px-11': 'calc(11px * var(--ts, 1))',
        'px-11.5': 'calc(11.5px * var(--ts, 1))',
        'px-12': 'calc(12px * var(--ts, 1))',
        'px-12.5': 'calc(12.5px * var(--ts, 1))',
        'px-13': 'calc(13px * var(--ts, 1))',
        'px-13.5': 'calc(13.5px * var(--ts, 1))',
        'px-14': 'calc(14px * var(--ts, 1))',
        'px-15': 'calc(15px * var(--ts, 1))',
        'px-16': 'calc(16px * var(--ts, 1))',
        'px-17': 'calc(17px * var(--ts, 1))',
        'px-18': 'calc(18px * var(--ts, 1))',
        'px-19': 'calc(19px * var(--ts, 1))',
        'px-20': 'calc(20px * var(--ts, 1))',
        'px-22': 'calc(22px * (1 + (var(--ts, 1) - 1) * 0.6))',
        'px-24': 'calc(24px * (1 + (var(--ts, 1) - 1) * 0.6))',
        'px-26': 'calc(26px * (1 + (var(--ts, 1) - 1) * 0.6))',
        'px-28': 'calc(28px * (1 + (var(--ts, 1) - 1) * 0.6))',
        'px-30': 'calc(30px * (1 + (var(--ts, 1) - 1) * 0.4))',
        'px-32': 'calc(32px * (1 + (var(--ts, 1) - 1) * 0.4))',
        'px-34': 'calc(34px * (1 + (var(--ts, 1) - 1) * 0.4))',
        'px-38': 'calc(38px * (1 + (var(--ts, 1) - 1) * 0.4))',
        'px-40': 'calc(40px * (1 + (var(--ts, 1) - 1) * 0.4))',
        'px-44': 'calc(44px * (1 + (var(--ts, 1) - 1) * 0.25))',
        'px-46': 'calc(46px * (1 + (var(--ts, 1) - 1) * 0.25))',
        'px-48': 'calc(48px * (1 + (var(--ts, 1) - 1) * 0.25))',
        'px-52': 'calc(52px * (1 + (var(--ts, 1) - 1) * 0.25))',
        'px-64': 'calc(64px * (1 + (var(--ts, 1) - 1) * 0.25))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'spin-medium': 'spin 6s linear infinite reverse',
        'spin-fast': 'spin 4s linear infinite',
        'card-appear': 'card-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'tab-fade': 'tab-fade 0.25s ease-out both',
      },
    },
  },
  plugins: [],
}
