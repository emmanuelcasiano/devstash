"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Check, Copy, Crown, Loader2, WandSparkles } from "lucide-react";

import { optimizePrompt } from "@/actions/ai";
import { usePlan } from "@/components/billing/plan-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** The write textarea grows with its content between these bounds, then scrolls. */
const MIN_HEIGHT = 120;
const DEFAULT_MAX_HEIGHT = 400;

type Tab = "write" | "preview" | "suggestion";

interface MarkdownEditorProps {
    value: string;
    /** Display mode (Preview only) vs. edit mode (Write + Preview). */
    readOnly?: boolean;
    /** Tallest either pane grows before it scrolls internally. Defaults to 400. */
    maxHeight?: number;
    onValueChange?: (value: string) => void;
    className?: string;
    /** Item title, sent as extra context to the AI "Optimize" feature only. */
    title?: string | null;
    /**
     * Shows the Pro-gated "Optimize" button — only passed `true` for prompt
     * items in the create dialog and the item drawer's edit mode, never in
     * read-only view.
     */
    showOptimize?: boolean;
}

/**
 * Markdown editor for prose item types (notes, prompts) with Write/Preview tabs.
 * Mirrors {@link CodeEditor}'s chrome — dark container, header bar, Copy button —
 * but renders GitHub Flavored Markdown via `react-markdown` instead of Monaco.
 */
export function MarkdownEditor({
    value,
    readOnly = false,
    maxHeight = DEFAULT_MAX_HEIGHT,
    onValueChange,
    className,
    title,
    showOptimize = false,
}: MarkdownEditorProps) {
    const [tab, setTab] = useState<Tab>("write");
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { hasPro } = usePlan();

    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [optimizing, setOptimizing] = useState(false);

    // A readonly editor only ever shows Preview; edit mode honours the tab state.
    const activeTab: Tab = readOnly ? "preview" : tab;
    const showSuggestionTab = showOptimize && (suggestion !== null || optimizing);

    const resize = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(
            maxHeight,
            Math.max(MIN_HEIGHT, el.scrollHeight),
        )}px`;
    }, [maxHeight]);

    // Re-fit the textarea when it becomes visible or the value changes upstream
    // (entering edit mode with prefilled content, switching items, …).
    useEffect(() => {
        if (activeTab === "write") resize();
    }, [activeTab, value, resize]);

    const handleCopy = useCallback(async () => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error("Failed to copy markdown:", error);
        }
    }, [value]);

    const handleOptimize = useCallback(async () => {
        if (!hasPro || optimizing || !value.trim()) return;

        setOptimizing(true);
        setTab("suggestion");

        const result = await optimizePrompt({ title: title ?? "", content: value });

        setOptimizing(false);

        if (!result.success) {
            toast.error(result.error);
            setTab("write");
            return;
        }

        setSuggestion(result.data.prompt);
    }, [hasPro, optimizing, value, title]);

    function handleAccept() {
        if (suggestion) onValueChange?.(suggestion);
        setSuggestion(null);
        setTab("write");
    }

    function handleDiscard() {
        setSuggestion(null);
        setTab("write");
    }

    return (
        <div
            className={cn(
                "overflow-hidden rounded-lg border border-border bg-[#1e1e1e]",
                className,
            )}
        >
            <div className="flex items-center justify-between border-b border-border bg-[#2d2d2d] px-2 py-1.5">
                <div className="flex items-center gap-1">
                    {!readOnly && (
                        <TabButton
                            active={activeTab === "write"}
                            onClick={() => setTab("write")}
                        >
                            Write
                        </TabButton>
                    )}
                    <TabButton
                        active={activeTab === "preview"}
                        onClick={() => setTab("preview")}
                    >
                        Preview
                    </TabButton>
                    {showSuggestionTab && (
                        <TabButton
                            active={activeTab === "suggestion"}
                            onClick={() => setTab("suggestion")}
                        >
                            Suggestion
                        </TabButton>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {showOptimize && !readOnly && (
                        <OptimizeButton
                            hasPro={hasPro}
                            loading={optimizing}
                            disabled={!value.trim()}
                            onClick={handleOptimize}
                        />
                    )}
                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!value}
                        aria-label="Copy markdown"
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                        {copied ? (
                            <Check className="size-3.5" />
                        ) : (
                            <Copy className="size-3.5" />
                        )}
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
            </div>

            {activeTab === "write" && (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(event) => onValueChange?.(event.target.value)}
                    onInput={resize}
                    spellCheck={false}
                    placeholder="Write Markdown…"
                    style={{ minHeight: MIN_HEIGHT, maxHeight }}
                    className="editor-scroll block w-full resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-[#e5e5e5] outline-none placeholder:text-muted-foreground"
                />
            )}

            {activeTab === "preview" && (
                <div
                    style={{ maxHeight }}
                    className="editor-scroll overflow-y-auto px-4 py-3"
                >
                    {value.trim() ? (
                        <div className="markdown-preview">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {value}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Nothing to preview.
                        </p>
                    )}
                </div>
            )}

            {activeTab === "suggestion" && (
                <div className="flex flex-col">
                    <div
                        style={{ maxHeight }}
                        className="editor-scroll overflow-y-auto px-4 py-3"
                    >
                        {optimizing ? (
                            <div className="space-y-2" aria-hidden>
                                <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                                <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
                                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                                <div className="h-3 w-3/6 animate-pulse rounded bg-muted" />
                            </div>
                        ) : (
                            suggestion && (
                                <div className="markdown-preview">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {suggestion}
                                    </ReactMarkdown>
                                </div>
                            )
                        )}
                    </div>
                    {!optimizing && suggestion && (
                        <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleDiscard}
                            >
                                Discard
                            </Button>
                            <Button type="button" size="sm" onClick={handleAccept}>
                                Use this version
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                active
                    ? "bg-[#1e1e1e] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
            )}
        >
            {children}
        </button>
    );
}

function OptimizeButton({
    hasPro,
    loading,
    disabled,
    onClick,
}: {
    hasPro: boolean;
    loading: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    if (!hasPro) {
        return (
            <Tooltip>
                <TooltipTrigger
                    render={
                        <button
                            type="button"
                            aria-disabled="true"
                            className="inline-flex cursor-not-allowed items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground opacity-60"
                        />
                    }
                >
                    <Crown className="size-3.5" />
                    Optimize
                </TooltipTrigger>
                <TooltipContent>AI features require Pro subscription</TooltipContent>
            </Tooltip>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            aria-label="Optimize prompt"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
            {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
            ) : (
                <WandSparkles className="size-3.5" />
            )}
            Optimize
        </button>
    );
}
