"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Check, Copy, Crown, Loader2, Sparkles } from "lucide-react";
import type { BeforeMount, OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

import { explainCode } from "@/actions/ai";
import { usePlan } from "@/components/billing/plan-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ExplainItemType } from "@/lib/ai/explain";
import { toMonacoLanguage } from "@/lib/code-language";
import { cn } from "@/lib/utils";
import { useEditorPreferences } from "@/components/editor/editor-preferences-provider";
import type { EditorTheme } from "@/lib/validation/editor-preferences";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
    loading: () => (
        <div className="h-30 w-full animate-pulse bg-muted" />
    ),
});

/** The editor grows with its content between these bounds, then scrolls. */
const MIN_HEIGHT = 120;
const DEFAULT_MAX_HEIGHT = 400;

/** Ratio between line height and font size in the original 11px/16px design. */
const LINE_HEIGHT_RATIO = 16 / 11;

/**
 * One Monaco theme per {@link EditorTheme} preference, each tuned to a
 * distinct, readable dark palette. Registered once per Monaco instance in
 * {@link BeforeMount}. `vs-dark` here is the app's own neutral theme (Tailwind
 * `neutral-*`, i.e. what the `oklch(... 0 0)` design tokens resolve to) — not
 * Monaco's built-in theme of the same name.
 */
const MONACO_THEME_NAMES: Record<EditorTheme, string> = {
    "vs-dark": "devstash-dark",
    monokai: "devstash-monokai",
    "github-dark": "devstash-github-dark",
};

const THEME_DEFINITIONS: Record<string, editor.IStandaloneThemeData> = {
    "devstash-dark": {
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
    },
    "devstash-monokai": {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
            "editor.background": "#272822",
            "editor.foreground": "#f8f8f2",
            "editorGutter.background": "#272822",
            "editorLineNumber.foreground": "#75715e",
            "editorLineNumber.activeForeground": "#f8f8f2",
            "editor.lineHighlightBackground": "#3e3d32",
            "editor.lineHighlightBorder": "#00000000",
            "editor.selectionBackground": "#49483e",
            "editorIndentGuide.background1": "#3e3d32",
            "editorWidget.background": "#272822",
            "editorWidget.border": "#ffffff1a",
            "scrollbarSlider.background": "#ffffff1a",
            "scrollbarSlider.hoverBackground": "#ffffff33",
            "scrollbarSlider.activeBackground": "#ffffff4d",
        },
    },
    "devstash-github-dark": {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
            "editor.background": "#0d1117",
            "editor.foreground": "#c9d1d9",
            "editorGutter.background": "#0d1117",
            "editorLineNumber.foreground": "#6e7681",
            "editorLineNumber.activeForeground": "#c9d1d9",
            "editor.lineHighlightBackground": "#161b22",
            "editor.lineHighlightBorder": "#00000000",
            "editor.selectionBackground": "#264f78",
            "editorIndentGuide.background1": "#21262d",
            "editorWidget.background": "#161b22",
            "editorWidget.border": "#30363d",
            "scrollbarSlider.background": "#ffffff1a",
            "scrollbarSlider.hoverBackground": "#ffffff33",
            "scrollbarSlider.activeBackground": "#ffffff4d",
        },
    },
};

type ViewTab = "code" | "explain";

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
    /** Item title, sent as extra context to the AI "Explain" feature only. */
    title?: string | null;
    /**
     * Shows the Pro-gated "Explain" button and Code/Explain tabs — only passed
     * `true` from the item drawer's read view (snippet/command types), never
     * from the create/edit forms.
     */
    showExplain?: boolean;
}

export function CodeEditor({
    value,
    language,
    typeName,
    readOnly = false,
    maxHeight = DEFAULT_MAX_HEIGHT,
    onValueChange,
    className,
    title,
    showExplain = false,
}: CodeEditorProps) {
    const [height, setHeight] = useState(MIN_HEIGHT);
    const [copied, setCopied] = useState(false);
    const { preferences } = useEditorPreferences();
    const { hasPro } = usePlan();

    const [tab, setTab] = useState<ViewTab>("code");
    const [explanation, setExplanation] = useState<string | null>(null);
    const [explaining, setExplaining] = useState(false);

    const monacoLanguage = toMonacoLanguage(language, typeName);
    const displayLanguage =
        language?.trim() || (typeName === "command" ? "shell" : "");
    const showTabs = showExplain && (explanation !== null || explaining);

    const handleBeforeMount = useCallback<BeforeMount>((monaco) => {
        for (const [name, theme] of Object.entries(THEME_DEFINITIONS)) {
            monaco.editor.defineTheme(name, theme);
        }
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

    const handleExplain = useCallback(async () => {
        if (!hasPro || explaining || !value.trim()) return;
        if (typeName !== "snippet" && typeName !== "command") return;

        setExplaining(true);
        setTab("explain");

        const result = await explainCode({
            title: title ?? "",
            content: value,
            language: displayLanguage,
            typeName: typeName as ExplainItemType,
        });

        setExplaining(false);

        if (!result.success) {
            toast.error(result.error);
            setTab("code");
            return;
        }

        setExplanation(result.data.explanation);
    }, [hasPro, explaining, value, typeName, title, displayLanguage]);

    return (
        <div
            className={cn(
                "overflow-hidden rounded-lg border border-border bg-[#171717]",
                className,
            )}
        >
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                {showTabs ? (
                    <div className="flex items-center gap-1">
                        <TabButton active={tab === "code"} onClick={() => setTab("code")}>
                            Code
                        </TabButton>
                        <TabButton
                            active={tab === "explain"}
                            onClick={() => setTab("explain")}
                        >
                            Explain
                        </TabButton>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5" aria-hidden>
                        <span className="size-3 rounded-full bg-[#ff5f57]" />
                        <span className="size-3 rounded-full bg-[#febc2e]" />
                        <span className="size-3 rounded-full bg-[#28c840]" />
                    </div>
                )}
                <div className="flex items-center gap-2">
                    {displayLanguage && (
                        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {displayLanguage}
                        </span>
                    )}
                    {showExplain && (
                        <ExplainButton
                            hasPro={hasPro}
                            loading={explaining}
                            disabled={!value.trim()}
                            onClick={handleExplain}
                        />
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

            <div style={{ height }} className={cn(showTabs && tab === "explain" && "hidden")}>
                <MonacoEditor
                    value={value}
                    language={monacoLanguage}
                    theme={MONACO_THEME_NAMES[preferences.theme]}
                    beforeMount={handleBeforeMount}
                    onMount={handleMount}
                    onChange={(next) => onValueChange?.(next ?? "")}
                    options={{
                        readOnly,
                        domReadOnly: readOnly,
                        automaticLayout: true,
                        minimap: { enabled: preferences.minimap },
                        scrollBeyondLastLine: false,
                        fontSize: preferences.fontSize,
                        lineHeight: Math.round(
                            preferences.fontSize * LINE_HEIGHT_RATIO,
                        ),
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
                        tabSize: preferences.tabSize,
                        wordWrap: preferences.wordWrap ? "on" : "off",
                        contextmenu: !readOnly,
                        scrollbar: {
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10,
                            alwaysConsumeMouseWheel: false,
                        },
                    }}
                />
            </div>

            {showTabs && tab === "explain" && (
                <div
                    style={{ maxHeight }}
                    className="editor-scroll overflow-y-auto px-4 py-3"
                >
                    {explaining ? (
                        <div className="space-y-2" aria-hidden>
                            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-full animate-pulse rounded bg-muted" />
                            <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-full animate-pulse rounded bg-muted" />
                            <div className="h-3 w-3/6 animate-pulse rounded bg-muted" />
                        </div>
                    ) : (
                        explanation && (
                            <div className="markdown-preview">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {explanation}
                                </ReactMarkdown>
                            </div>
                        )
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
                    ? "bg-[#171717] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
            )}
        >
            {children}
        </button>
    );
}

function ExplainButton({
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
                    Explain
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
            aria-label="Explain code"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
            {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
            ) : (
                <Sparkles className="size-3.5" />
            )}
            Explain
        </button>
    );
}
