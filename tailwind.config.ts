import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        salmon: "hsl(var(--salmon))",
        sage: "hsl(var(--sage))",
        lavender: "hsl(var(--lavender))",
        status: {
          "planned-0": "hsl(var(--status-planned-0))",
          "planned-1": "hsl(var(--status-planned-1))",
          "planned-2": "hsl(var(--status-planned-2))",
          "planned-3": "hsl(var(--status-planned-3))",
          "planned-4": "hsl(var(--status-planned-4))",
          "planned-5": "hsl(var(--status-planned-5))",
          "planned-6": "hsl(var(--status-planned-6))",
          "planned-7": "hsl(var(--status-planned-7))",
          "planned-8": "hsl(var(--status-planned-8))",
          "planned-9": "hsl(var(--status-planned-9))",
          "in-progress-0": "hsl(var(--status-in-progress-0))",
          "in-progress-1": "hsl(var(--status-in-progress-1))",
          "in-progress-2": "hsl(var(--status-in-progress-2))",
          "in-progress-3": "hsl(var(--status-in-progress-3))",
          "in-progress-4": "hsl(var(--status-in-progress-4))",
          "in-progress-5": "hsl(var(--status-in-progress-5))",
          "in-progress-6": "hsl(var(--status-in-progress-6))",
          "in-progress-7": "hsl(var(--status-in-progress-7))",
          "in-progress-8": "hsl(var(--status-in-progress-8))",
          "in-progress-9": "hsl(var(--status-in-progress-9))",
          "completed-0": "hsl(var(--status-completed-0))",
          "completed-1": "hsl(var(--status-completed-1))",
          "completed-2": "hsl(var(--status-completed-2))",
          "completed-3": "hsl(var(--status-completed-3))",
          "completed-4": "hsl(var(--status-completed-4))",
          "completed-5": "hsl(var(--status-completed-5))",
          "completed-6": "hsl(var(--status-completed-6))",
          "completed-7": "hsl(var(--status-completed-7))",
          "completed-8": "hsl(var(--status-completed-8))",
          "completed-9": "hsl(var(--status-completed-9))",
          "cancelled-0": "hsl(var(--status-cancelled-0))",
          "cancelled-1": "hsl(var(--status-cancelled-1))",
          "cancelled-2": "hsl(var(--status-cancelled-2))",
          "cancelled-3": "hsl(var(--status-cancelled-3))",
          "cancelled-4": "hsl(var(--status-cancelled-4))",
          "cancelled-5": "hsl(var(--status-cancelled-5))",
          "cancelled-6": "hsl(var(--status-cancelled-6))",
          "cancelled-7": "hsl(var(--status-cancelled-7))",
          "cancelled-8": "hsl(var(--status-cancelled-8))",
          "cancelled-9": "hsl(var(--status-cancelled-9))",
        },
      },
      fontFamily: {
        sans: ['Mulish', 'system-ui', 'sans-serif'],
        heading: ['Quicksand', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
