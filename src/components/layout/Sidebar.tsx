"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Folder, PanelLeft, Settings, Star } from "lucide-react";

import { getItemTypeIcon, getItemTypeSlug, isProItemType } from "@/lib/constants/item-types";
import { mockUser } from "@/lib/mock-data";
import type { CollectionWithStats } from "@/lib/db/collections";
import type { ItemTypeWithCount } from "@/lib/db/items";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { cn } from "@/lib/utils";

const RECENT_COLLECTIONS_LIMIT = 5;

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function Sidebar({
    collapsed = false,
    showCollapseToggle = false,
    itemTypes = [],
    collections = [],
}: {
    collapsed?: boolean;
    showCollapseToggle?: boolean;
    itemTypes?: ItemTypeWithCount[];
    collections?: CollectionWithStats[];
}) {
    const { toggleSidebar } = useSidebar();
    const pathname = usePathname();
    const favoriteCollections = collections.filter((collection) => collection.isFavorite);
    const recentCollections = collections
        .filter((collection) => !collection.isFavorite)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, RECENT_COLLECTIONS_LIMIT);

    return (
        <div className="flex h-full flex-col">
            {showCollapseToggle && (
                <div
                    className={cn(
                        "flex w-full shrink-0 items-center justify-between gap-2 border-b border-border p-2",
                        collapsed && "justify-center"
                    )}
                >
                    {!collapsed && (
                        <span className="px-2 text-sm font-medium text-foreground">Navigation</span>
                    )}
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Toggle sidebar"
                        onClick={toggleSidebar}
                    >
                        <PanelLeft />
                    </Button>
                </div>
            )}
            <ScrollArea className="min-h-0 flex-1">
                <nav className={cn("flex flex-col gap-4 p-3", collapsed && "items-center px-2")}>
                    <Collapsible defaultOpen={!collapsed}>
                        {!collapsed && (
                            <CollapsibleTrigger className="group/trigger flex w-full items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                Types
                                <ChevronDown className="size-3.5 transition-transform group-aria-expanded/trigger:rotate-180" />
                            </CollapsibleTrigger>
                        )}
                        <CollapsibleContent
                            className={cn(!collapsed && "flex flex-col gap-0.5", collapsed && "flex flex-col gap-1")}
                        >
                            {itemTypes.map((type) => {
                                const Icon = getItemTypeIcon(type.icon);
                                const href = `/items/${getItemTypeSlug(type.name)}`;
                                const isActive = pathname === href;
                                const label = type.name.charAt(0).toUpperCase() + type.name.slice(1);
                                const isPro = isProItemType(type.name);

                                if (collapsed) {
                                    return (
                                        <Tooltip key={type.id}>
                                            <TooltipTrigger
                                                render={
                                                    <Link
                                                        href={href}
                                                        className={cn(
                                                            "flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
                                                            isActive && "bg-muted text-foreground"
                                                        )}
                                                    />
                                                }
                                            >
                                                <Icon className="size-4" style={{ color: type.color }} />
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                {label} · {type.count}
                                                {isPro && " · PRO"}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }

                                return (
                                    <Link
                                        key={type.id}
                                        href={href}
                                        className={cn(
                                            "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted",
                                            isActive && "bg-muted"
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon className="size-4" style={{ color: type.color }} />
                                            {label}
                                            {isPro && (
                                                <Badge
                                                    variant="secondary"
                                                    className="h-4 rounded px-1 text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase"
                                                >
                                                    PRO
                                                </Badge>
                                            )}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{type.count}</span>
                                    </Link>
                                );
                            })}
                        </CollapsibleContent>
                    </Collapsible>

                    <Separator />

                    <Collapsible defaultOpen={!collapsed}>
                        {!collapsed && (
                            <CollapsibleTrigger className="group/trigger flex w-full items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                Collections
                                <ChevronDown className="size-3.5 transition-transform group-aria-expanded/trigger:rotate-180" />
                            </CollapsibleTrigger>
                        )}
                        <CollapsibleContent className="flex flex-col gap-3">
                            {favoriteCollections.length > 0 && (
                                <div className="flex flex-col gap-0.5">
                                    {!collapsed && (
                                        <span className="px-2 py-1 text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
                                            Favorites
                                        </span>
                                    )}
                                    {favoriteCollections.map((collection) =>
                                        collapsed ? (
                                            <Tooltip key={collection.id}>
                                                <TooltipTrigger
                                                    render={
                                                        <Link
                                                            href={`/collections/${collection.id}`}
                                                            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        />
                                                    }
                                                >
                                                    <Folder className="size-4" style={{ color: collection.color }} />
                                                </TooltipTrigger>
                                                <TooltipContent side="right">{collection.name}</TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Link
                                                key={collection.id}
                                                href={`/collections/${collection.id}`}
                                                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted"
                                            >
                                                <span className="flex items-center gap-2 truncate">
                                                    <Folder className="size-4 shrink-0" style={{ color: collection.color }} />
                                                    <span className="truncate">{collection.name}</span>
                                                </span>
                                                <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                                            </Link>
                                        )
                                    )}
                                </div>
                            )}

                            {recentCollections.length > 0 && (
                                <div className="flex flex-col gap-0.5">
                                    {!collapsed && (
                                        <span className="px-2 py-1 text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
                                            Recent
                                        </span>
                                    )}
                                    {recentCollections.map((collection) =>
                                        collapsed ? (
                                            <Tooltip key={collection.id}>
                                                <TooltipTrigger
                                                    render={
                                                        <Link
                                                            href={`/collections/${collection.id}`}
                                                            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        />
                                                    }
                                                >
                                                    <Folder className="size-4" style={{ color: collection.color }} />
                                                </TooltipTrigger>
                                                <TooltipContent side="right">{collection.name}</TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Link
                                                key={collection.id}
                                                href={`/collections/${collection.id}`}
                                                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted"
                                            >
                                                <span className="flex items-center gap-2 truncate">
                                                    <Folder className="size-4 shrink-0" style={{ color: collection.color }} />
                                                    <span className="truncate">{collection.name}</span>
                                                </span>
                                                <span
                                                    className="size-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: collection.color }}
                                                    aria-hidden
                                                />
                                            </Link>
                                        )
                                    )}
                                </div>
                            )}

                            {!collapsed && (
                                <Link
                                    href="/collections"
                                    className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    View all collections
                                </Link>
                            )}
                        </CollapsibleContent>
                    </Collapsible>
                </nav>
            </ScrollArea>

            <div
                className={cn(
                    "sticky bottom-0 flex w-full shrink-0 items-center gap-2 border-t border-border bg-sidebar p-3",
                    collapsed && "justify-center px-2"
                )}
            >
                {collapsed ? (
                    <Tooltip>
                        <TooltipTrigger
                            render={<Avatar className="cursor-pointer" />}
                        >
                            <AvatarFallback>{getInitials(mockUser.name)}</AvatarFallback>
                        </TooltipTrigger>
                        <TooltipContent side="right">{mockUser.name}</TooltipContent>
                    </Tooltip>
                ) : (
                    <>
                        <Avatar>
                            <AvatarFallback>{getInitials(mockUser.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{mockUser.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{mockUser.email}</p>
                        </div>
                        <Button variant="ghost" size="icon-sm" aria-label="Settings">
                            <Settings />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

export function SidebarAside({
    itemTypes,
    collections,
}: {
    itemTypes: ItemTypeWithCount[];
    collections: CollectionWithStats[];
}) {
    const { collapsed } = useSidebar();

    return (
        <aside
            className={cn(
                "hidden h-full shrink-0 self-stretch border-r border-border transition-[width] duration-200 lg:flex lg:flex-col",
                collapsed ? "w-16" : "w-64"
            )}
        >
            <Sidebar
                collapsed={collapsed}
                showCollapseToggle
                itemTypes={itemTypes}
                collections={collections}
            />
        </aside>
    );
}
