import { Search } from "lucide-react";

import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { getItemTypeColor } from "@/lib/constants/item-types";

interface MockType {
    name: string;
    icon: string;
    label: string;
}

const SIDEBAR_TYPES: MockType[] = [
    { name: "snippet", icon: "Code", label: "Snippets" },
    { name: "prompt", icon: "Sparkles", label: "Prompts" },
    { name: "command", icon: "Terminal", label: "Commands" },
    { name: "note", icon: "StickyNote", label: "Notes" },
    { name: "file", icon: "File", label: "Files" },
    { name: "link", icon: "Link", label: "Links" },
];

const CARD_TYPES: MockType[] = [
    { name: "snippet", icon: "Code", label: "Snippet" },
    { name: "prompt", icon: "Sparkles", label: "Prompt" },
    { name: "command", icon: "Terminal", label: "Command" },
    { name: "note", icon: "StickyNote", label: "Note" },
    { name: "image", icon: "Image", label: "Image" },
    { name: "link", icon: "Link", label: "Link" },
];

/** Static, decorative miniature of the DevStash dashboard for the hero. */
export function DashboardMock() {
    return (
        <div className="relative h-80 overflow-hidden rounded-2xl border border-border bg-card p-5">
            <span className="mb-3.5 block text-center text-xs font-semibold tracking-wide text-muted-foreground">
                ...with DevStash
            </span>
            <div
                className="grid h-[260px] grid-cols-[104px_1fr] gap-3.5"
                aria-hidden="true"
            >
                <div className="flex flex-col gap-1 rounded-lg bg-muted/60 px-2 py-2.5">
                    {SIDEBAR_TYPES.map((type) => (
                        <div key={type.name} className="flex items-center gap-2 rounded-md p-1.5">
                            <ItemTypeIcon
                                iconName={type.icon}
                                color={getItemTypeColor(type.name)}
                                className="size-3.5 shrink-0"
                            />
                            <span className="text-[0.62rem] font-semibold whitespace-nowrap text-muted-foreground">
                                {type.label}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex min-w-0 flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1.5">
                            <Search className="size-3 text-muted-foreground" />
                            <span className="text-[0.65rem] text-muted-foreground">Search...</span>
                        </div>
                        <div className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1.5 text-[0.62rem] font-bold whitespace-nowrap text-white">
                            + New
                        </div>
                    </div>
                    <div className="grid flex-1 grid-cols-2 grid-rows-3 gap-2.5">
                        {CARD_TYPES.map((type) => (
                            <div
                                key={type.name}
                                className="flex flex-col justify-center gap-1.5 rounded-lg border border-t-[3px] border-border bg-muted/60 px-2.5 py-2"
                                style={{ borderTopColor: getItemTypeColor(type.name) }}
                            >
                                <ItemTypeIcon
                                    iconName={type.icon}
                                    color={getItemTypeColor(type.name)}
                                    className="mb-0.5 size-3"
                                />
                                <span className="block h-[5px] w-[70%] rounded-[3px] bg-muted-foreground/50" />
                                <span className="block h-[5px] w-[45%] rounded-[3px] bg-border" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
