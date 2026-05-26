/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Portal specific colors derived from existing design
                primary: {
                    DEFAULT: '#4361ee', // Primary blue
                    hover: '#3a56d4',
                },
                danger: {
                    DEFAULT: '#ef4444',
                },
                success: {
                    DEFAULT: '#22c55e',
                },
                // Dark/Light mode base colors
                dark: {
                    bg: '#0f172a',    // Background
                    card: '#1e293b',  // Card background
                    text: '#e2e8f0',  // Text color
                    border: '#334155' // Border color
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}