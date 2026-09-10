import { Label } from "@/components/ui/label";

/**
 * A labelled form control: a `<Label htmlFor>` stacked above its input. Shared by
 * the item drawer's edit mode and the new-item dialog, which each had their own
 * identical copy.
 */
export function Field({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}
