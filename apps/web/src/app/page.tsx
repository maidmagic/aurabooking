import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Offers } from "@/components/landing/offers";
import { SocialProof } from "@/components/landing/social-proof";
import { DemoFooter } from "@/components/landing/demo-footer";

export default function LandingPage() {
  return (
    <div className="bg-[#FAFAFA]">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Offers />
      <SocialProof />
      <DemoFooter />
    </div>
  );
}
