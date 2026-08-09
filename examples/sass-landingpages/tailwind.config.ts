import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#043873",
          700: "#2E4E73",
        },
        blue: {
          500: "#4F9CF9",
          100: "#C4DEFD",
        },
        yellow: {
          300: "#FFE492",
        },
        ink: {
          900: "#212529",
        },
        cream: "#F7F7EE",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        nav: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      fontSize: {
        h1: ["72px", { lineHeight: "1.1" }],
        h2: ["64px", { lineHeight: "1.1" }],
        testimonial: ["70px", { lineHeight: "84px" }],
        h4: ["36px", { lineHeight: "1.2" }],
        h5: ["28px", { lineHeight: "36px" }],
        p1: ["24px", { lineHeight: "36px" }],
        "p1-reg": ["24px", { lineHeight: "32px" }],
        p2: ["18px", { lineHeight: "30px" }],
        "p2-med": ["18px", { lineHeight: "23px" }],
        p3: ["16px", { lineHeight: "20px" }],
        nav: ["18px", { lineHeight: "23px" }],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        price: "0 4px 50px rgba(0,0,0,0.08)",
        card: "15px 10px 50px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
