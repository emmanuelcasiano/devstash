"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, WandSparkles } from "lucide-react";

import { generateDescription } from "@/actions/ai";
import { usePlan } from "@/components/billing/plan-provider";
import { Button } from "@/components/ui/button";

/** The structured payload sent to the `generateDescription` action — see `buildDescribeInput`. */
export interface DescribeSourceInput {
    title: string;
    content: string;
    url: string;
    fileName: string;
    language: string;
}

/**
 * Icon button beside the Description field's label in the create item dialog
 * and the item drawer's edit mode. Generates a 1-2 sentence summary via the
 * `generateDescription` Server Action from whatever's currently in the form —
 * no save required first — and hands the result to `onGenerate`, which
 * overwrites the field (the normal Create/Save button is still the only
 * commit point). Mirrors `TagSuggestions`: hidden entirely for Free users
 * client-side; the action enforces the Pro gate server-side regardless.
 */
export function DescribeButton({
    source,
    onGenerate,
    disabled = false,
}: {
    source: DescribeSourceInput;
    onGenerate: (description: string) => void;
    disabled?: boolean;
}) {
    const { hasPro } = usePlan();
    const [loading, setLoading] = useState(false);

    if (!hasPro) return null;

    const hasSource =
        source.title.trim() !== "" ||
        source.content.trim() !== "" ||
        source.url.trim() !== "" ||
        source.fileName.trim() !== "";

    async function handleGenerate() {
        if (!hasSource) {
            toast.error("Add a title or some content first.");
            return;
        }

        setLoading(true);
        const result = await generateDescription(source);
        setLoading(false);

        if (!result.success) {
            toast.error(result.error);
            return;
        }

        onGenerate(result.data.description);
    }

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleGenerate}
            disabled={disabled || loading || !hasSource}
            aria-label="Generate description with AI"
            title="Generate description with AI"
            className="text-muted-foreground"
        >
            {loading ? <Loader2 className="animate-spin" /> : <WandSparkles />}
        </Button>
    );
}
