import { Section, Button, Placeholder } from "@/components/ui";

export function Hero() {
  return (
    <Section bg="navy">
      <img
        src="/assets/hero-wave.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div className="relative flex flex-col items-center gap-10 lg:flex-row lg:gap-[60px]">
        <div className="flex w-full flex-col gap-8 lg:w-1/2 lg:gap-[60px]">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-bold text-white lg:text-h2">
              Get More Done with whitepace
            </h1>
            <p className="text-p2 text-cream">
              The all-in-one workspace that helps your team plan, track and ship work
              together — without switching tools.
            </p>
          </div>
          <Button variant="primary" arrow radius="sm" className="w-fit px-5 py-5">
            Try Whitepace free
          </Button>
        </div>
        <div className="w-full lg:w-1/2">
          <Placeholder label="Product screenshot — Hero" />
        </div>
      </div>
    </Section>
  );
}
