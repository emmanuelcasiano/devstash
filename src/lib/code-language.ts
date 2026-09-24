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

/** One entry in the language dropdown shown for snippets/commands. */
export interface LanguageOption {
    value: string;
    label: string;
}

/**
 * Curated languages offered by the dropdown. `value` is the canonical Monaco
 * language id, stored directly as `Item.language` when picked from the
 * dropdown — so `toMonacoLanguage` needs no alias lookup for values chosen
 * this way.
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
    { value: "typescript", label: "TypeScript" },
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "shell", label: "Shell / Bash" },
    { value: "powershell", label: "PowerShell" },
    { value: "json", label: "JSON" },
    { value: "yaml", label: "YAML" },
    { value: "markdown", label: "Markdown" },
    { value: "sql", label: "SQL" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "java", label: "Java" },
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "csharp", label: "C#" },
    { value: "ruby", label: "Ruby" },
    { value: "php", label: "PHP" },
    { value: "kotlin", label: "Kotlin" },
    { value: "dockerfile", label: "Dockerfile" },
    { value: "plaintext", label: "Plain Text" },
];

const LANGUAGE_OPTION_VALUES = new Set(LANGUAGE_OPTIONS.map((option) => option.value));

/**
 * Resolves a stored `Item.language` value to one of `LANGUAGE_OPTIONS`'s
 * canonical values, so the dropdown can show a matching selection for
 * pre-existing free-text values saved before the dropdown existed (e.g. "ts",
 * "bash"). Returns `null` when the value is empty or doesn't match any option
 * or alias — the dropdown then shows its placeholder instead of guessing,
 * leaving the underlying stored value untouched until the user picks one.
 */
export function resolveLanguageOption(language: string | null | undefined): string | null {
    const normalized = language?.trim().toLowerCase() ?? "";

    if (!normalized) {
        return null;
    }

    if (LANGUAGE_OPTION_VALUES.has(normalized)) {
        return normalized;
    }

    const aliased = LANGUAGE_ALIASES[normalized];
    return aliased && LANGUAGE_OPTION_VALUES.has(aliased) ? aliased : null;
}
