/**
 * Maps the free-text `Item.language` field (and, as a fallback, the item type)
 * onto a Monaco Editor language id so code content is highlighted correctly.
 *
 * The `language` column is user-entered, so it holds all kinds of spellings
 * ("TS", "bash", "node", "c++"). Anything not in {@link LANGUAGE_ALIASES} is
 * passed through lowercased — Monaco silently treats an unknown id as plain
 * text rather than throwing — and an empty value falls back to a sensible
 * default for the item type ("shell" for commands, "plaintext" otherwise).
 */

/** Common spellings/aliases that differ from Monaco's own language ids. */
const LANGUAGE_ALIASES: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    "ts.jsx": "typescript",
    js: "javascript",
    jsx: "javascript",
    node: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    shell: "shell",
    console: "shell",
    terminal: "shell",
    ps1: "powershell",
    py: "python",
    rb: "ruby",
    yml: "yaml",
    md: "markdown",
    "c++": "cpp",
    "c#": "csharp",
    cs: "csharp",
    golang: "go",
    rs: "rust",
    kt: "kotlin",
    dockerfile: "dockerfile",
    docker: "dockerfile",
    htm: "html",
    "html5": "html",
    postgres: "sql",
    postgresql: "sql",
    mysql: "sql",
    text: "plaintext",
    txt: "plaintext",
    plain: "plaintext",
};

/** Item types whose content is treated as code (get the Monaco editor). */
export const CODE_ITEM_TYPES = new Set(["snippet", "command"]);

export function isCodeItemType(name: string | null | undefined): boolean {
    return name != null && CODE_ITEM_TYPES.has(name.toLowerCase());
}

export function toMonacoLanguage(
    language: string | null | undefined,
    typeName?: string | null,
): string {
    const normalized = language?.trim().toLowerCase() ?? "";

    if (normalized) {
        return LANGUAGE_ALIASES[normalized] ?? normalized;
    }

    if (typeName?.toLowerCase() === "command") {
        return "shell";
    }

    return "plaintext";
}
