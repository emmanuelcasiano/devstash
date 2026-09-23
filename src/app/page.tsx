import type { Metadata } from "next";

import { auth } from "@/auth";
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

export default async function Home() {
    const session = await auth();
    const isLoggedIn = Boolean(session?.user);

    return (
        <div className="overflow-x-hidden">
            <Navbar isLoggedIn={isLoggedIn} />
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
