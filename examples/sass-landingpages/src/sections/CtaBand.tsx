import { Section, Button } from "@/components/ui";

const appIcons = [
  { src: "/assets/appicon-apple.svg", label: "Download on the App Store" },
  { src: "/assets/appicon-windows.svg", label: "Download on Windows" },
  { src: "/assets/appicon-android.svg", label: "Get it on Google Play" },
];

type CtaBandProps = {
  heading: string;
  body: string;
  ctaLabel: string;
  secondaryText?: string;
  showAppIcons?: boolean;
  decorative?: boolean;
};

export function CtaBand({
  heading,
  body,
  ctaLabel,
  secondaryText,
  showAppIcons = false,
  decorative = false,
}: CtaBandProps) {
  return (
    <Section bg="navy" tightBottom={showAppIcons}>
      {decorative && (
        <img
          src="/assets/hero-wave.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
        />
      )}
      <div className="relative flex flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-bold text-white lg:text-h1">{heading}</h2>
        <p className="max-w-2xl text-p1-reg text-cream">{body}</p>
        <Button variant="primary" arrow radius="sm" className="px-10 py-5">
          {ctaLabel}
        </Button>
        {secondaryText && <p className="text-p3 text-cream">{secondaryText}</p>}
        {showAppIcons && (
          <div className="mt-4 flex items-center gap-10">
            {appIcons.map((icon) => (
              <img key={icon.src} src={icon.src} alt={icon.label} className="h-[60px] w-[60px]" />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
