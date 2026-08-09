import { Section, Button, Placeholder } from "@/components/ui";

type FeatureRowProps = {
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

export function FeatureRow({
  bg,
  reverse = false,
  heading,
  body,
  ctaLabel,
  ctaVariant = "primary",
  image,
}: FeatureRowProps) {
  const headingColor = bg === "navy" ? "text-white" : "text-ink-900";
  const bodyColor = bg === "navy" ? "text-cream" : "text-ink-900/80";

  return (
    <Section bg={bg}>
      <div
        className={`flex flex-col items-center gap-10 lg:gap-[98px] ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"}`}
      >
        <div className="flex w-full flex-col gap-6 lg:w-1/2 lg:gap-[60px]">
          <div className="flex flex-col gap-4 lg:gap-6">
            <h2 className={`text-3xl font-bold lg:text-h1 ${headingColor}`}>{heading}</h2>
            <p className={`text-p2 ${bodyColor}`}>{body}</p>
          </div>
          <Button variant={ctaVariant} arrow radius="sm" className="w-fit px-6 py-3 lg:px-8 lg:py-4">
            {ctaLabel}
          </Button>
        </div>
        <div className="w-full lg:w-1/2">
          {image.type === "illustration" ? (
            <img src={image.src} alt={image.alt} className="mx-auto h-auto w-full" />
          ) : (
            <Placeholder label={image.label} />
          )}
        </div>
      </div>
    </Section>
  );
}
