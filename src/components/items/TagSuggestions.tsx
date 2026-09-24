"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, X } from "lucide-react";

import { generateAutoTags } from "@/actions/ai";
import { usePlan } from "@/components/billing/plan-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * "Suggest Tags" control for the create item dialog and the item drawer's edit
 * mode: a Pro-only button that calls the `generateAutoTags` Server Action and
 * renders the result as accept/reject badge chips. Accepting folds the tag into
 * the caller's comma-separated tag field state via `onAccept` — nothing is
 * written to the database here, the normal Create/Save button is still the only
 * commit point.
 *
 * Hidden entirely for Free users (server-side Pro gating in the action is what
 * actually enforces the restriction; this is UI-level visibility only).
 */
export function TagSuggestions({
    title,
    sourceText,
    existingTags,
    onAccept,
    disabled = false,
}: {
    title: string;
    sourceText: string;
    existingTags: string[];
    onAccept: (tag: string) => void;
    disabled?: boolean;
}) {
    const { hasPro } = usePlan();
    const [suggestions, setSuggestions] = useState<string[] | null>(null);
    const [loading, setLoading] = useState(false);

    if (!hasPro) return null;

    async function handleSuggest() {
        if (title.trim() === "") {
            toast.error("Add a title first.");
            return;
        }

        setLoading(true);
        const result = await generateAutoTags({ title, content: sourceText });
        setLoading(false);

        if (!result.success) {
            toast.error(result.error);
            return;
        }

        const existingLower = new Set(existingTags.map((tag) => tag.toLowerCase()));
        setSuggestions(
            result.data.tags.filter((tag) => !existingLower.has(tag.toLowerCase())),
        );
    }

    function accept(tag: string) {
        onAccept(tag);
        setSuggestions((prev) => (prev ? prev.filter((t) => t !== tag) : prev));
    }

    function reject(tag: string) {
        setSuggestions((prev) => (prev ? prev.filter((t) => t !== tag) : prev));
    }

    return (
        <div className="flex flex-col gap-2">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSuggest}
                disabled={disabled || loading}
                className="w-fit text-muted-foreground"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Suggest Tags
            </Button>

            {suggestions !== null &&
                (suggestions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((tag) => (
                            <Badge key={tag} variant="outline" className="gap-1 pr-1">
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => accept(tag)}
                                    aria-label={`Accept tag "${tag}"`}
                                    className="rounded-full p-0.5 text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-500"
                                >
                                    <Check className="size-3" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => reject(tag)}
                                    aria-label={`Reject tag "${tag}"`}
                                    className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                                >
                                    <X className="size-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        No new tag suggestions.
                    </p>
                ))}
        </div>
    );
}
