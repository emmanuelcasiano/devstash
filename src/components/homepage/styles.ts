import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Blue → indigo gradient used by the homepage's primary call-to-action buttons. */
const GRADIENT_CTA =
    "border-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90";

type CtaVariant = "primary" | "outline" | "ghost";

interface CtaOptions {
    large?: boolean;
    full?: boolean;
}

/**
 * Class names for a homepage `<Link>` styled as a button. `Button` itself
 * renders a `<button>`, so navigation links reuse its variants instead.
 */
export function ctaClasses(variant: CtaVariant, { large, full }: CtaOptions = {}) {
    return cn(
        buttonVariants({ variant: variant === "primary" ? "default" : variant }),
        variant === "primary" && GRADIENT_CTA,
        large ? "h-11 px-6 text-base" : "h-9 px-4",
        full && "w-full",
    );
}
