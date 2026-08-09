import { Section, Button } from "@/components/ui";

const linkColumns = [
  {
    title: "Product",
    links: [
      { label: "Overview", active: true },
      { label: "Pricing" },
      { label: "Integrations" },
      { label: "Extension" },
    ],
  },
  {
    title: "Resources",
    links: [{ label: "Blog" }, { label: "Guides" }, { label: "Help center" }, { label: "API docs" }],
  },
  {
    title: "Company",
    links: [{ label: "About" }, { label: "Careers" }, { label: "Sponsors" }, { label: "Contact" }],
  },
];

const socialLinks = [
  { src: "/assets/social-facebook.svg", label: "Whitepace on Facebook", h: 17, w: 9 },
  { src: "/assets/social-twitter.svg", label: "Whitepace on Twitter", h: 14, w: 17 },
  { src: "/assets/social-linkedin.svg", label: "Whitepace on LinkedIn", h: 15, w: 15 },
];

export function Footer() {
  return (
    <Section bg="navy" as="footer" tightBottom>
      <div className="flex flex-col gap-16 lg:gap-[200px]">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-[100px]">
          <div className="flex max-w-[240px] flex-col gap-4">
            <a href="/" className="flex items-center gap-[10px]">
              <img src="/assets/logo-icon.svg" alt="" aria-hidden="true" className="h-[29px] w-[37px]" />
              <span className="text-h5 font-bold text-white">whitepace</span>
            </a>
            <p className="text-p2 text-cream">
              The all-in-one workspace that helps teams plan, track and ship work
              together.
            </p>
          </div>

          {linkColumns.map((column) => (
            <div key={column.title} className="flex flex-col gap-4">
              <p className="text-p2 font-bold text-white">{column.title}</p>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href="#"
                      className={`text-p3 hover:text-yellow-300 ${
                        link.active ? "text-yellow-300" : "text-cream"
                      }`}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-col gap-4">
            <p className="text-h5 font-bold text-white">Try It Today</p>
            <p className="text-p3 text-cream">
              Start your free trial — no credit card required.
            </p>
            <Button variant="primary" className="w-fit px-6 py-3">
              Start today
            </Button>
          </div>
        </div>

        <div className="border-t border-navy-700 pt-8">
          <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:justify-between lg:text-left">
            <button
              type="button"
              className="flex items-center gap-2 text-p3 text-cream hover:opacity-80"
            >
              English
              <img src="/assets/chevron-down.svg" alt="" aria-hidden="true" className="h-[5px] w-[10px]" />
            </button>

            <p className="text-p3 text-cream">
              Terms &amp; privacy · Security · Status · ©2021 Whitepace LLC.
            </p>

            <div className="flex items-center gap-8">
              {socialLinks.map((social) => (
                <a key={social.label} href="#" aria-label={social.label}>
                  <img src={social.src} alt="" aria-hidden="true" style={{ height: social.h, width: social.w }} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
