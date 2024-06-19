import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
      fontFamily: {
        'poppins': ['Poppins'],
      },
      fontSize: {
        '8xl': ['5.25rem', { lineHeight: '1' }]
      },
      colors: {
        'liquid-purple': '#9966FF',
        'liquid-blue': '#6699FF',
        'liquid-alt-purple': '#906FFF',
        'liquid-green': '#00773a'
      },
      spacing: {
        100: '25rem',
        108: '27rem',
        116: '29rem',
        120: '30rem'
      },
    },
	},
	plugins: [],
}
