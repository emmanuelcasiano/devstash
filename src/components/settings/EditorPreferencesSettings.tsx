"use client";

import { Loader2 } from "lucide-react";

import { useEditorPreferences } from "@/components/editor/editor-preferences-provider";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    EDITOR_FONT_SIZES,
    EDITOR_TAB_SIZES,
    EDITOR_THEMES,
    type EditorFontSize,
    type EditorTabSize,
    type EditorTheme,
} from "@/lib/validation/editor-preferences";

const THEME_LABELS: Record<EditorTheme, string> = {
    "vs-dark": "VS Dark",
    monokai: "Monokai",
    "github-dark": "GitHub Dark",
};

/**
 * The Settings page's "Editor" section — font size, tab size, theme, word
 * wrap, and minimap controls for the Monaco `CodeEditor`. Reads and writes
 * through `useEditorPreferences()`, which auto-saves every change (there is
 * no save button) and shows a toast once the save completes.
 */
export function EditorPreferencesSettings() {
    const { preferences, setPreferences, saving } = useEditorPreferences();

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Font size" htmlFor="editor-font-size">
                    <Select
                        value={preferences.fontSize}
                        onValueChange={(value: EditorFontSize | null) => {
                            if (value !== null) {
                                setPreferences({ ...preferences, fontSize: value });
                            }
                        }}
                    >
                        <SelectTrigger id="editor-font-size">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EDITOR_FONT_SIZES.map((size) => (
                                <SelectItem key={size} value={size}>
                                    {size}px
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                <Field label="Tab size" htmlFor="editor-tab-size">
                    <Select
                        value={preferences.tabSize}
                        onValueChange={(value: EditorTabSize | null) => {
                            if (value !== null) {
                                setPreferences({ ...preferences, tabSize: value });
                            }
                        }}
                    >
                        <SelectTrigger id="editor-tab-size">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EDITOR_TAB_SIZES.map((size) => (
                                <SelectItem key={size} value={size}>
                                    {size} spaces
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                <Field label="Theme" htmlFor="editor-theme">
                    <Select
                        value={preferences.theme}
                        onValueChange={(value: EditorTheme | null) => {
                            if (value !== null) {
                                setPreferences({ ...preferences, theme: value });
                            }
                        }}
                    >
                        <SelectTrigger id="editor-theme">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EDITOR_THEMES.map((theme) => (
                                <SelectItem key={theme} value={theme}>
                                    {THEME_LABELS[theme]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <Label htmlFor="editor-word-wrap">Word wrap</Label>
                        <p className="text-sm text-muted-foreground">
                            Wrap long lines instead of scrolling horizontally.
                        </p>
                    </div>
                    <Switch
                        id="editor-word-wrap"
                        checked={preferences.wordWrap}
                        onCheckedChange={(checked) =>
                            setPreferences({ ...preferences, wordWrap: checked })
                        }
                    />
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <Label htmlFor="editor-minimap">Minimap</Label>
                        <p className="text-sm text-muted-foreground">
                            Show the code minimap on the right edge of the editor.
                        </p>
                    </div>
                    <Switch
                        id="editor-minimap"
                        checked={preferences.minimap}
                        onCheckedChange={(checked) =>
                            setPreferences({ ...preferences, minimap: checked })
                        }
                    />
                </div>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {saving && <Loader2 className="size-3 animate-spin" />}
                {saving ? "Saving…" : "Changes save automatically."}
            </p>
        </div>
    );
}
