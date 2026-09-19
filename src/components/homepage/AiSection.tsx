import { Check } from "lucide-react";

import { ScrollFadeIn } from "@/components/homepage/ScrollFadeIn";
import { Badge } from "@/components/ui/badge";

const AI_FEATURES = [
    "AI auto-tag suggestions",
    "AI summaries for long snippets & notes",
    '"Explain This Code" on demand',
    "AI prompt optimizer",
];

const AI_TAGS = ["react", "hooks", "auth", "typescript"];

type TokenKind = "keyword" | "function" | "comment";
type Token = string | [text: string, kind: TokenKind];

const TOKEN_CLASSES: Record<TokenKind, string> = {
    keyword: "text-purple-400",
    function: "text-blue-400",
    comment: "text-zinc-500",
};

const CODE_LINES: Token[][] = [
    [["export function", "keyword"], " ", ["useAuth", "function"], "() {"],
    ["  ", ["const", "keyword"], " [user, setUser] = useState(", ["null", "keyword"], ");"],
    [],
    ["  useEffect(() => {"],
    ["    ", ["// fetch current session", "comment"]],
    ["    fetchSession().then(setUser);"],
    ["  }, []);"],
    [],
    ["  ", ["return", "keyword"], " { user };"],
    ["}"],
];

function CodeLine({ tokens }: { tokens: Token[] }) {
    if (tokens.length === 0) return <div>&nbsp;</div>;
    return (
        <div className="whitespace-pre">
            {tokens.map((token, i) =>
                typeof token === "string" ? (
                    token
                ) : (
                    <span key={i} className={TOKEN_CLASSES[token[1]]}>
                        {token[0]}
                    </span>
                ),
            )}
        </div>
    );
}

export function AiSection() {
    return (
        <section className="border-y border-border bg-muted/30 px-6 py-24">
            <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2">
                <ScrollFadeIn>
                    <Badge className="mb-4 h-auto border-0 bg-gradient-to-r from-violet-400 to-pink-400 px-3 py-1.5 font-bold text-zinc-950">
                        Pro Feature
                    </Badge>
                    <h2 className="mb-3.5 text-3xl font-bold tracking-tight">
                        Let AI handle the busywork
                    </h2>
                    <p className="mb-6 text-muted-foreground">
                        DevStash Pro tags, summarizes, and explains your saved knowledge
                        automatically — so organizing never slows you down.
                    </p>
                    <ul className="divide-y divide-border">
                        {AI_FEATURES.map((feature) => (
                            <li key={feature} className="flex items-center gap-2.5 py-2">
                                <Check className="size-4 shrink-0 text-emerald-500" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </ScrollFadeIn>

                <ScrollFadeIn>
                    <div className="overflow-hidden rounded-xl border border-border bg-background">
                        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
                            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                            <span className="size-2.5 rounded-full bg-[#febc2e]" />
                            <span className="size-2.5 rounded-full bg-[#28c840]" />
                            <span className="ml-2 text-xs text-muted-foreground">useAuth.ts</span>
                        </div>
                        <pre className="overflow-x-auto px-5 py-4 font-mono text-[0.82rem] leading-7 text-zinc-300">
                            <code>
                                {CODE_LINES.map((tokens, i) => (
                                    <CodeLine key={i} tokens={tokens} />
                                ))}
                            </code>
                        </pre>
                        <div className="border-t border-border px-5 pt-4 pb-5">
                            <span className="mb-2.5 block text-xs font-bold tracking-wider text-pink-400 uppercase">
                                AI Generated Tags
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {AI_TAGS.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full bg-pink-400/15 px-2.5 py-1 text-xs font-semibold text-pink-400"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollFadeIn>
            </div>
        </section>
    );
}
