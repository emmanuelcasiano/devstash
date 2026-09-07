"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Check, Copy } from "lucide-react";
import type { BeforeMount, OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

import { toMonacoLanguage } from "@/lib/code-language";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
    loading: () => (
        <div className="h-30 w-full animate-pulse bg-muted" />
    ),
});

/** The editor grows with its content between these bounds, then scrolls. */
const MIN_HEIGHT = 120;
const DEFAULT_MAX_HEIGHT = 400;

/** IDE-style dense type. */
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;

/**
 * Dark theme tuned to the app's neutral palette (Tailwind `neutral-*`, which is
 * what the `oklch(... 0 0)` design tokens resolve to). Registered once per
 * Monaco instance in {@link BeforeMount}.
 */
const THEME_NAME = "devstash-dark";
const THEME: editor.IStandaloneThemeData = {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
        "editor.background": "#171717",
        "editor.foreground": "#e5e5e5",
        "editorGutter.background": "#171717",
        "editorLineNumber.foreground": "#525252",
        "editorLineNumber.activeForeground": "#a1a1a1",
        "editor.lineHighlightBackground": "#262626",
        "editor.lineHighlightBorder": "#00000000",
        "editor.selectionBackground": "#3f3f46",
        "editorIndentGuide.background1": "#262626",
        "editorWidget.background": "#171717",
        "editorWidget.border": "#ffffff1a",
        "scrollbarSlider.background": "#ffffff1a",
        "scrollbarSlider.hoverBackground": "#ffffff33",
        "scrollbarSlider.activeBackground": "#ffffff4d",
    },
};

interface CodeEditorProps {
    value: string;
    /** Free-text `Item.language`; mapped to a Monaco language id. */
    language?: string | null;
    /** Item type name — picks a default language when `language` is empty. */
    typeName?: string | null;
    /** Display mode (no editing) vs. edit mode. */
    readOnly?: boolean;
    /** Tallest the editor grows before it scrolls internally. Defaults to 400. */
    maxHeight?: number;
    onValueChange?: (value: string) => void;
    className?: string;
}

export function CodeEditor({
    value,
    language,
    typeName,
    readOnly = false,
    maxHeight = DEFAULT_MAX_HEIGHT,
    onValueChange,
    className,
}: CodeEditorProps) {
    const [height, setHeight] = useState(MIN_HEIGHT);
    const [copied, setCopied] = useState(false);

    const monacoLanguage = toMonacoLanguage(language, typeName);
    const displayLanguage =
        language?.trim() || (typeName === "command" ? "shell" : "");

    const handleBeforeMount = useCallback<BeforeMount>((monaco) => {
        monaco.editor.defineTheme(THEME_NAME, THEME);
    }, []);

    const handleMount = useCallback<OnMount>(
        (editor) => {
            const applyHeight = () => {
                const next = Math.min(
                    maxHeight,
                    Math.max(MIN_HEIGHT, editor.getContentHeight()),
                );
                setHeight(next);
            };

            editor.onDidContentSizeChange(applyHeight);
            applyHeight();
        },
        [maxHeight],
    );

    const handleCopy = useCallback(async () => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error("Failed to copy code:", error);
        }
    }, [value]);

    return (
        <div
            className={cn(
                "overflow-hidden rounded-lg border border-border bg-[#171717]",
                className,
            )}
        >
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-1.5" aria-hidden>
                    <span className="size-3 rounded-full bg-[#ff5f57]" />
                    <span className="size-3 rounded-full bg-[#febc2e]" />
                    <span className="size-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex items-center gap-2">
                    {displayLanguage && (
                        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {displayLanguage}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!value}
                        aria-label="Copy code"
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

            <div style={{ height }}>
                <MonacoEditor
                    value={value}
                    language={monacoLanguage}
                    theme={THEME_NAME}
                    beforeMount={handleBeforeMount}
                    onMount={handleMount}
                    onChange={(next) => onValueChange?.(next ?? "")}
                    options={{
                        readOnly,
                        domReadOnly: readOnly,
                        automaticLayout: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: FONT_SIZE,
                        lineHeight: LINE_HEIGHT,
                        fontFamily:
                            "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
                        folding: false,
                        lineNumbers: "on",
                        lineNumbersMinChars: 3,
                        lineDecorationsWidth: 8,
                        renderLineHighlight: readOnly ? "none" : "line",
                        overviewRulerLanes: 0,
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true,
                        padding: { top: 12, bottom: 12 },
                        tabSize: 2,
                        wordWrap: "off",
                        contextmenu: !readOnly,
                        scrollbar: {
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10,
                            alwaysConsumeMouseWheel: false,
                        },
                    }}
                />
            </div>
        </div>
    );
}
