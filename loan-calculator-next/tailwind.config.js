/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(220, 30%, 10%)', // Dark blue background
  			foreground: 'hsl(210, 40%, 98%)', // Light text color
  			card: 'hsl(220, 25%, 15%)', // Slightly lighter than background for cards
  			'card-foreground': 'hsl(210, 40%, 98%)',
  			popover: 'hsl(220, 25%, 15%)',
  			'popover-foreground': 'hsl(210, 40%, 98%)',
  			 primary: 'hsl(199, 89%, 48%)', // Bright blue for primary elements
  			'primary-foreground': 'hsl(210, 40%, 98%)',
  			secondary: 'hsl(220, 20%, 20%)', // Darker blue for secondary elements
  			'secondary-foreground': 'hsl(210, 40%, 98%)',
  			muted: 'hsl(220, 20%, 20%)',
  			'muted-foreground': 'hsl(215, 20%, 65%)',
  			 accent: 'hsl(199, 89%, 48%)', // Same as primary for consistency
  			'accent-foreground': 'hsl(210, 40%, 98%)',
  			destructive: 'hsl(0, 62%, 30%)',
  			'destructive-foreground': 'hsl(210, 40%, 98%)',
  			border: 'hsl(220, 20%, 20%)',
  			input: 'hsl(220, 30%, 20%)', // Slightly lighter than background for input fields
  			ring: 'hsl(199, 89%, 48%)',
  			'input-border': 'hsl(199, 89%, 60%)', // Light blue for input borders
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'lg': '0.5rem',
  			'xl': '1rem',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
