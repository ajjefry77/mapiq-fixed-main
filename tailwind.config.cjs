// tailwind.config.cjs
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                // Wired to the CSS custom properties in src/style.css so
                // bg-accent, text-accent-soft, border-accent/60, etc. are
                // real, first-class Tailwind utilities that automatically
                // follow the app's dark theme — no CSS override file
                // needed, so nothing can ever conflict with Tailwind.
                accent: {
                    DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
                    soft: 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
                    dim: 'rgb(var(--accent-dim-rgb) / <alpha-value>)',
                },
            },
        },
    },
    plugins: [],
}
