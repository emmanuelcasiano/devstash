import { Label } from "@/components/ui/label";

/**
 * A labelled form control: a `<Label htmlFor>` stacked above its input. Shared by
 * the item drawer's edit mode and the new-item dialog, which each had their own
 * identical copy.
 */
export function Field({
    label,
    htmlFor,
    action,
    children,
}: {
    label: string;
    htmlFor: string;
    /** Optional control (e.g. an AI-generate icon button) shown beside the label. */
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <Label htmlFor={htmlFor}>{label}</Label>
                {action}
            </div>
            {children}
        </div>
    );
}
