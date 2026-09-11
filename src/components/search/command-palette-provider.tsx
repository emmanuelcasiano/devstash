"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface CommandPaletteContextValue {
    /** Whether the command palette is currently open. */
    open: boolean;
    /** Open or close the command palette. */
    setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/**
 * Holds the command palette's open state and listens globally for the
 * Cmd+K (Mac) / Ctrl+K (Windows) shortcut. Wrap the app content in this once
 * and render `<CommandPalette />` as a descendant so the `TopBar` search
 * input, the keyboard shortcut, and the dialog itself all share one toggle.
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
            event.preventDefault();
            setOpen((prev) => !prev);
        }

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <CommandPaletteContext.Provider value={{ open, setOpen }}>
            {children}
        </CommandPaletteContext.Provider>
    );
}

export function useCommandPalette() {
    const ctx = useContext(CommandPaletteContext);
    if (!ctx) {
        throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
    }
    return ctx;
}
