import { Section } from "@/components/ui";

const sponsors = [
  { src: "/assets/sponsor-apple.svg", name: "Apple", h: 68, w: 56 },
  { src: "/assets/sponsor-microsoft.svg", name: "Microsoft", h: 62, w: 287 },
  { src: "/assets/sponsor-slack.svg", name: "Slack", h: 71, w: 280 },
  { src: "/assets/sponsor-google.svg", name: "Google", h: 70, w: 211 },
];

export function Sponsors() {
  return (
    <Section bg="white">
      <div className="flex flex-col items-center gap-10 text-center lg:gap-[100px]">
        <h2 className="text-3xl font-bold text-ink-900 lg:text-h1">Our sponsors</h2>
        <div className="flex flex-wrap items-center justify-center gap-10 lg:w-full lg:justify-between lg:gap-6">
          {sponsors.map((sponsor) => (
            <img
              key={sponsor.name}
              src={sponsor.src}
              alt={sponsor.name}
              style={{ height: sponsor.h, width: "auto", maxWidth: sponsor.w }}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
