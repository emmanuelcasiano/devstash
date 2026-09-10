import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * A small stat card: a colour-tinted icon tile beside a big number and a label.
 * Shared by the dashboard stats row and the profile page's Usage section.
 */
export function StatTile({
    icon: Icon,
    color,
    value,
    label,
}: {
    icon: LucideIcon;
    color: string;
    value: number;
    label: string;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3">
                <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}1a` }}
                >
                    <Icon className="size-5" style={{ color }} />
                </div>
                <div className="min-w-0">
                    <p className="text-2xl font-semibold text-foreground">
                        {value}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {label}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
