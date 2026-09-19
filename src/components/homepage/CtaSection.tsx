import Link from "next/link";

import { ScrollFadeIn } from "@/components/homepage/ScrollFadeIn";
import { ctaClasses } from "@/components/homepage/styles";

export function CtaSection() {
    return (
        <section className="px-6 py-24">
            <ScrollFadeIn className="mx-auto max-w-6xl text-center">
                <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
                    Ready to Organize Your Knowledge?
                </h2>
                <p className="mb-7 text-muted-foreground">
                    Join developers who stopped losing track of the things they build with.
                </p>
                <Link href="/register" className={ctaClasses("primary", { large: true })}>
                    Get Started Free
                </Link>
            </ScrollFadeIn>
        </section>
    );
}
