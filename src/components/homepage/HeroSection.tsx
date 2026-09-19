import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ChaosAnimation } from "@/components/homepage/ChaosAnimation";
import { DashboardMock } from "@/components/homepage/DashboardMock";
import { ScrollFadeIn } from "@/components/homepage/ScrollFadeIn";
import { ctaClasses } from "@/components/homepage/styles";

export function HeroSection() {
    return (
        <section className="px-6 pt-36 pb-24">
            <div className="mx-auto max-w-6xl">
                <ScrollFadeIn className="mx-auto mb-16 max-w-3xl text-center">
                    <h1 className="mb-5 text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
                        Stop Losing Your{" "}
                        <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                            Developer Knowledge
                        </span>
                    </h1>
                    <p className="mb-8 text-lg text-muted-foreground">
                        Snippets, prompts, commands, notes, files, and links — scattered across a
                        dozen tools. DevStash gives it all one fast, searchable home.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3.5">
                        <Link href="/register" className={ctaClasses("primary", { large: true })}>
                            Get Started Free
                        </Link>
                        <a href="#features" className={ctaClasses("outline", { large: true })}>
                            See Features
                        </a>
                    </div>
                </ScrollFadeIn>

                <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
                    <ScrollFadeIn>
                        <ChaosAnimation />
                    </ScrollFadeIn>
                    <ScrollFadeIn>
                        <div
                            className="flex w-full animate-arrow-pulse justify-center text-indigo-500 max-lg:rotate-90 lg:w-16"
                            aria-hidden="true"
                        >
                            <ArrowRight className="size-10" strokeWidth={3} />
                        </div>
                    </ScrollFadeIn>
                    <ScrollFadeIn>
                        <DashboardMock />
                    </ScrollFadeIn>
                </div>
            </div>
        </section>
    );
}
