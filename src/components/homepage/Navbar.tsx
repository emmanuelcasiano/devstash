"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ctaClasses } from "@/components/homepage/styles";
import { HomeLogo } from "@/components/homepage/HomeLogo";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD = 8;

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        function onScroll() {
            setScrolled(window.scrollY > SCROLL_THRESHOLD);
        }
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b transition-all duration-200",
                scrolled
                    ? "border-border bg-background/85 backdrop-blur-md"
                    : "border-transparent bg-transparent",
            )}
        >
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6">
                <HomeLogo />
                <nav className="hidden gap-7 text-sm text-muted-foreground sm:flex">
                    <a href="#features" className="transition-colors hover:text-foreground">
                        Features
                    </a>
                    <a href="#pricing" className="transition-colors hover:text-foreground">
                        Pricing
                    </a>
                </nav>
                <div className="flex items-center gap-2">
                    <Link href="/sign-in" className={ctaClasses("ghost")}>
                        Sign In
                    </Link>
                    <Link href="/register" className={ctaClasses("primary")}>
                        Get Started
                    </Link>
                </div>
            </div>
        </header>
    );
}
