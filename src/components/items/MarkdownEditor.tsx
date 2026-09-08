"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/** The write textarea grows with its content between these bounds, then scrolls. */
const MIN_HEIGHT = 120;
const DEFAULT_MAX_HEIGHT = 400;

type Tab = "write" | "preview";

interface MarkdownEditorProps {
    value: string;
    /** Display mode (Preview only) vs. edit mode (Write + Preview). */
    readOnly?: boolean;
    /** Tallest either pane grows before it scrolls internally. Defaults to 400. */
    maxHeight?: number;
    onValueChange?: (value: string) => void;
    className?: string;
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
}: MarkdownEditorProps) {
    const [tab, setTab] = useState<Tab>("write");
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // A readonly editor only ever shows Preview; edit mode honours the tab state.
    const activeTab: Tab = readOnly ? "preview" : tab;

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
                </div>
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

            {activeTab === "write" ? (
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
            ) : (
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
