export type FeatureRowData = {
  bg: "navy" | "white";
  reverse?: boolean;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaVariant?: "primary" | "outline";
  image:
    | { type: "illustration"; src: string; alt: string }
    | { type: "placeholder"; label: string };
};

export const featureRows: FeatureRowData[] = [
  {
    bg: "white",
    heading: "Project Management",
    body: "Plan, track and deliver every project from one shared workspace — no more spreadsheets or status-update meetings.",
    ctaLabel: "Get Started",
    image: { type: "placeholder", label: "Product screenshot — Project Management" },
  },
  {
    bg: "white",
    reverse: true,
    heading: "Work Together, Anywhere",
    body: "Bring your whole team into one place with real-time comments, mentions and shared boards that keep everyone aligned.",
    ctaLabel: "Read more",
    ctaVariant: "outline",
    image: {
      type: "illustration",
      src: "/assets/illustration-work-together.svg",
      alt: "Illustration of teammates collaborating together",
    },
  },
  {
    bg: "navy",
    heading: "Use as Extension",
    body: "Bring Whitepace into the tools you already use — a lightweight browser extension keeps your tasks one click away.",
    ctaLabel: "Try it now",
    image: { type: "placeholder", label: "Product screenshot — Browser extension" },
  },
  {
    bg: "white",
    reverse: true,
    heading: "Customise it to your needs",
    body: "Tailor fields, workflows and views to match the way your team actually works, without waiting on engineering.",
    ctaLabel: "Try Taskey",
    ctaVariant: "outline",
    image: { type: "placeholder", label: "Product screenshot — Custom workflow" },
  },
  {
    bg: "white",
    heading: "100% your data",
    body: "Your data stays yours. Export anytime, control access down to the field, and audit every change in the timeline.",
    ctaLabel: "Get Started",
    image: {
      type: "illustration",
      src: "/assets/illustration-your-data.svg",
      alt: "Illustration representing secure data ownership",
    },
  },
  {
    bg: "navy",
    reverse: true,
    heading: "Apps for every device",
    body: "Stay in sync on desktop, mobile or the web — Whitepace follows your work wherever you open it.",
    ctaLabel: "Try it now",
    image: {
      type: "illustration",
      src: "/assets/illustration-apps.svg",
      alt: "Illustration of Whitepace running across multiple devices",
    },
  },
];
