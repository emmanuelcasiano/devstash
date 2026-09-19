import { HomeLogo } from "@/components/homepage/HomeLogo";

interface FooterLink {
    label: string;
    href: string;
}

interface FooterColumn {
    title: string;
    links: FooterLink[];
}

// Company and Legal pages don't exist yet, so they stay non-navigating placeholders.
const COLUMNS: FooterColumn[] = [
    {
        title: "Product",
        links: [
            { label: "Features", href: "#features" },
            { label: "Pricing", href: "#pricing" },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About", href: "#" },
            { label: "Blog", href: "#" },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy", href: "#" },
            { label: "Terms", href: "#" },
        ],
    },
];

export function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-border pt-14">
            <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 px-6 pb-10 sm:flex-row sm:gap-12">
                <div>
                    <HomeLogo />
                    <p className="mt-3 max-w-56 text-sm text-muted-foreground">
                        Your developer knowledge, all in one place.
                    </p>
                </div>
                <div className="flex flex-wrap gap-8 sm:gap-14">
                    {COLUMNS.map((column) => (
                        <div key={column.title}>
                            <h4 className="mb-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                {column.title}
                            </h4>
                            <ul className="flex flex-col gap-2.5">
                                {column.links.map((link) => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            <div className="border-t border-border px-6 py-5 text-center text-sm text-muted-foreground">
                &copy; {year} DevStash. All rights reserved.
            </div>
        </footer>
    );
}
