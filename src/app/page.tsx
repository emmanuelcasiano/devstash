import type { Metadata } from "next";

import { AiSection } from "@/components/homepage/AiSection";
import { CtaSection } from "@/components/homepage/CtaSection";
import { FeaturesSection } from "@/components/homepage/FeaturesSection";
import { Footer } from "@/components/homepage/Footer";
import { HeroSection } from "@/components/homepage/HeroSection";
import { Navbar } from "@/components/homepage/Navbar";
import { PricingSection } from "@/components/homepage/PricingSection";

export const metadata: Metadata = {
    title: "DevStash — Stop Losing Your Developer Knowledge",
    description:
        "Snippets, prompts, commands, notes, files, and links in one fast, searchable home for your developer knowledge.",
};

export default function Home() {
    return (
        <div className="overflow-x-hidden">
            <Navbar />
            <main>
                <HeroSection />
                <FeaturesSection />
                <AiSection />
                <PricingSection />
                <CtaSection />
            </main>
            <Footer />
        </div>
    );
}
