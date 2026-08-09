import { Section, Button } from "@/components/ui";

type Plan = {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    tagline: "For individuals just getting started",
    features: [
      "Up to 3 boards",
      "Unlimited tasks",
      "Basic integrations",
      "Community support",
      "1 GB storage",
      "Mobile apps",
    ],
  },
  {
    name: "Personal",
    price: "$11.99",
    tagline: "For growing teams that need more",
    features: [
      "Unlimited boards",
      "Unlimited tasks",
      "Advanced integrations",
      "Priority support",
      "50 GB storage",
      "Mobile & desktop apps",
    ],
    highlighted: true,
  },
  {
    name: "Organization",
    price: "$49.99",
    tagline: "For companies that need control",
    features: [
      "Everything in Personal",
      "SSO & SAML",
      "Admin controls",
      "Dedicated support",
      "Unlimited storage",
      "Audit logs",
    ],
  },
];

function PriceCard({ plan }: { plan: Plan }) {
  const isHighlighted = plan.highlighted;

  return (
    <div
      className={`flex w-full max-w-sm flex-col gap-6 rounded-lg lg:gap-[25px] ${
        isHighlighted
          ? "bg-navy-900 px-8 py-12 shadow-price lg:px-11 lg:py-20"
          : "border border-yellow-300 bg-white px-8 py-10 lg:px-11 lg:py-10"
      }`}
    >
      <div className="flex flex-col gap-2">
        <p className={`text-p1 font-semibold ${isHighlighted ? "text-white" : "text-ink-900"}`}>
          {plan.name}
        </p>
        <p className={`text-h4 font-bold ${isHighlighted ? "text-yellow-300" : "text-ink-900"}`}>
          {plan.price}
        </p>
        <p className={`text-p2-med font-medium ${isHighlighted ? "text-cream" : "text-ink-900/70"}`}>
          {plan.tagline}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3">
            <img src="/assets/check.svg" alt="" aria-hidden="true" className="h-[21px] w-[21px]" />
            <span className={`text-p3 ${isHighlighted ? "text-white" : "text-ink-900"}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Button
        variant={isHighlighted ? "primary" : "outline"}
        className="w-full px-10 py-4 text-p3 font-medium"
      >
        Get Started
      </Button>
    </div>
  );
}

export function Pricing() {
  return (
    <Section bg="white">
      <div className="flex flex-col items-center gap-6 text-center lg:gap-6">
        <h2 className="text-3xl font-bold text-ink-900 lg:text-h1">Choose Your Plan</h2>
        <p className="max-w-[979px] text-p2 text-ink-900/80">
          Simple pricing that scales with your team — start free and upgrade whenever
          you need more room to grow.
        </p>
      </div>
      <div className="mt-14 flex flex-col items-center gap-8 lg:mt-[60px] lg:flex-row lg:items-stretch lg:justify-center lg:gap-8">
        {plans.map((plan) => (
          <PriceCard key={plan.name} plan={plan} />
        ))}
      </div>
    </Section>
  );
}
