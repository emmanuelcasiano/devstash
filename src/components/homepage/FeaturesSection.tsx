import { createElement } from "react";
import {
    Code,
    File,
    FolderOpen,
    Search,
    Sparkles,
    Terminal,
    type LucideIcon,
} from "lucide-react";

import { ScrollFadeIn } from "@/components/homepage/ScrollFadeIn";
import { Card } from "@/components/ui/card";
import { getItemTypeColor } from "@/lib/constants/item-types";

// Search isn't an item type, so it gets its own accent.
const SEARCH_COLOR = "#6366f1";

interface Feature {
    title: string;
    description: string;
    icon: LucideIcon;
    color: string;
}

const FEATURES: Feature[] = [
    {
        title: "Code Snippets",
        description: "Save and organize reusable code with syntax highlighting and language tags.",
        icon: Code,
        color: getItemTypeColor("snippet"),
    },
    {
        title: "AI Prompts",
        description: "Store your best prompts and system messages so you never rewrite them again.",
        icon: Sparkles,
        color: getItemTypeColor("prompt"),
    },
    {
        title: "Instant Search",
        description: "Find anything in seconds across content, tags, titles, and types.",
        icon: Search,
        color: SEARCH_COLOR,
    },
    {
        title: "Commands",
        description: "Keep the shell commands you always forget one search away.",
        icon: Terminal,
        color: getItemTypeColor("command"),
    },
    {
        title: "Files & Docs",
        description: "Upload files and images alongside the notes that explain them.",
        icon: File,
        color: getItemTypeColor("file"),
    },
    {
        title: "Collections",
        description: "Group items into collections that match how you actually work.",
        icon: FolderOpen,
        color: getItemTypeColor("link"),
    },
];

export function FeaturesSection() {
    return (
        <section id="features" className="scroll-mt-16 px-6 py-24">
            <div className="mx-auto max-w-6xl">
                <ScrollFadeIn>
                    <h2 className="mb-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                        Everything in one place
                    </h2>
                    <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">
                        One hub for every kind of knowledge you need to ship faster.
                    </p>
                </ScrollFadeIn>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((feature) => (
                        <ScrollFadeIn key={feature.title}>
                            <Card
                                className="h-full gap-0 p-7 transition-all duration-200 hover:-translate-y-1 hover:ring-(--feature-color)"
                                style={{ "--feature-color": feature.color } as React.CSSProperties}
                            >
                                <div
                                    className="mb-4 flex size-11 items-center justify-center rounded-lg"
                                    style={{ backgroundColor: `${feature.color}1a` }}
                                >
                                    {createElement(feature.icon, {
                                        className: "size-5",
                                        style: { color: feature.color },
                                    })}
                                </div>
                                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {feature.description}
                                </p>
                            </Card>
                        </ScrollFadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
}
