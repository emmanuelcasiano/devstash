"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { ctaClasses } from "@/components/homepage/styles";
import { HomeLogo } from "@/components/homepage/HomeLogo";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD = 8;

const NAV_LINKS = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
];

export function Navbar({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
    const logoHref = isLoggedIn ? "/dashboard" : "/";
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

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
                "fixed inset-x-0 top-0 z-50 border-b transition-all duration-200",
                scrolled || menuOpen
                    ? "border-border bg-background/85 backdrop-blur-md"
                    : "border-transparent bg-transparent",
            )}
        >
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6">
                <HomeLogo href={logoHref} />
                <nav className="hidden gap-7 text-sm text-muted-foreground sm:flex">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="transition-colors hover:text-foreground"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-2">
                    {isLoggedIn ? (
                        <Link href="/dashboard" className={ctaClasses("primary")}>
                            Open DevStash
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/sign-in"
                                className={cn(ctaClasses("ghost"), "hidden sm:inline-flex")}
                            >
                                Sign In
                            </Link>
                            <Link href="/register" className={ctaClasses("primary")}>
                                Get Started
                            </Link>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-nav"
                        className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:hidden"
                    >
                        {menuOpen ? (
                            <X className="size-5" />
                        ) : (
                            <Menu className="size-5" />
                        )}
                    </button>
                </div>
            </div>
            {menuOpen && (
                <nav
                    id="mobile-nav"
                    className="flex flex-col border-t border-border px-6 py-2 sm:hidden"
                >
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className="py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {link.label}
                        </a>
                    ))}
                    {!isLoggedIn && (
                        <Link
                            href="/sign-in"
                            className="py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Sign In
                        </Link>
                    )}
                </nav>
            )}
        </header>
    );
}
