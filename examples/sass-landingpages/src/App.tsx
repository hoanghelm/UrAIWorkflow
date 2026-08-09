import { Header } from "@/sections/Header";
import { Hero } from "@/sections/Hero";
import { FeatureRow } from "@/components/FeatureRow";
import { featureRows } from "@/sections/features.data";
import { Pricing } from "@/sections/Pricing";
import { CtaBand } from "@/sections/CtaBand";
import { Sponsors } from "@/sections/Sponsors";
import { Testimonial } from "@/sections/Testimonial";
import { Footer } from "@/sections/Footer";

export default function App() {
  const [projectManagement, workTogether, useAsExtension, customise, yourData, apps] =
    featureRows;

  return (
    <>
      <Header />
      <main>
        <Hero />
        <FeatureRow {...projectManagement} />
        <FeatureRow {...workTogether} />
        <FeatureRow {...useAsExtension} />
        <FeatureRow {...customise} />
        <Pricing />
        <CtaBand
          heading="Your work, your way"
          body="Bring your whole team into one workspace built around how you actually get things done."
          ctaLabel="Try Whitepace free"
          decorative
        />
        <FeatureRow {...yourData} />
        <Sponsors />
        <FeatureRow {...apps} />
        <Testimonial />
        <CtaBand
          heading="Try Whitepace today"
          body="Join thousands of teams already planning, tracking and shipping work in Whitepace."
          ctaLabel="Try Whitepace free"
          secondaryText="On a big team? Contact sales"
          showAppIcons
        />
      </main>
      <Footer />
    </>
  );
}
