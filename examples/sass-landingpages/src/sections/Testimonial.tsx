import { useState } from "react";
import { Section } from "@/components/ui";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatar: string;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "Whitepace replaced three separate tools for us. Our whole team finally works from one shared source of truth.",
    name: "Sarah Chen",
    role: "Product Lead, Nova",
    avatar: "/assets/avatar-1.png",
  },
  {
    quote:
      "The customisation is what sold us — we set up Whitepace to match our exact process in an afternoon, not a quarter.",
    name: "Daniel Reyes",
    role: "Operations Manager, Fleet",
    avatar: "/assets/avatar-2.png",
  },
  {
    quote:
      "Support is fast and the apps are rock solid across desktop and mobile. It just gets out of the way.",
    name: "Priya Nair",
    role: "Founder, Loop Studio",
    avatar: "/assets/avatar-3.png",
  },
];

export function Testimonial() {
  const [active, setActive] = useState(1);

  return (
    <Section bg="white">
      <div className="flex flex-col items-center gap-10 text-center lg:gap-[60px]">
        <h2 className="text-3xl font-bold text-ink-900 lg:text-testimonial">
          What Our Clients Says
        </h2>

        <div className="flex flex-col items-stretch gap-8 lg:flex-row lg:gap-8">
          {testimonials.map((testimonial, index) => {
            const isActive = index === active;
            return (
              <div
                key={testimonial.name}
                className={`flex w-full max-w-sm flex-col gap-10 rounded-lg px-8 py-10 text-left shadow-card lg:gap-[60px] lg:px-10 lg:py-[60px] ${
                  isActive ? "bg-blue-500 text-white" : "bg-white text-ink-900"
                }`}
              >
                <div
                  className={`flex flex-col gap-6 border-b pb-8 lg:pb-10 ${
                    isActive ? "border-white/30" : "border-ink-900/10"
                  }`}
                >
                  <img src="/assets/quote.svg" alt="" aria-hidden="true" className="h-[62px] w-[86px]" />
                  <p className="text-p2">{testimonial.quote}</p>
                </div>
                <div className="flex items-end gap-6">
                  <img
                    src={testimonial.avatar}
                    alt=""
                    className="h-[95px] w-[95px] rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <p className="text-p1 font-semibold">{testimonial.name}</p>
                    <p className={`text-p3 ${isActive ? "text-white/80" : "text-ink-900/70"}`}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div role="tablist" aria-label="Testimonial slides" className="flex items-center gap-3">
          {testimonials.map((testimonial, index) => (
            <button
              key={testimonial.name}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Show testimonial from ${testimonial.name}`}
              onClick={() => setActive(index)}
              className={`h-3 w-3 rounded-full ${index === active ? "bg-blue-500" : "bg-navy-900"}`}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
