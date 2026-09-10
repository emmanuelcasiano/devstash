"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    ChevronDown,
    ChevronsUpDown,
    Folder,
    LogOut,
    PanelLeft,
    Star,
    UserRound,
} from "lucide-react";

import { getItemTypeSlug, isProItemType } from "@/lib/constants/item-types";
import type { CollectionWithStats } from "@/lib/db/collections";
import type { ItemTypeWithCount } from "@/lib/db/items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { capitalize, cn } from "@/lib/utils";

const RECENT_COLLECTIONS_LIMIT = 5;

export type SidebarUser = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
};

/** A collapsible `Types` / `Collections` group with its chevron trigger. */
function SidebarSection({
    title,
    collapsed,
    children,
}: {
    title: string;
    collapsed: boolean;
    children: React.ReactNode;
}) {
    return (
        <Collapsible defaultOpen>
            {!collapsed && (
                <CollapsibleTrigger className="group/trigger flex w-full items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                    {title}
                    <ChevronDown className="size-3.5 transition-transform group-aria-expanded/trigger:rotate-180" />
                </CollapsibleTrigger>
            )}
            {children}
        </Collapsible>
    );
}

/** One item-type row: an icon + label + count link, or a tooltip'd icon when collapsed. */
function SidebarTypeLink({
    type,
    collapsed,
    pathname,
}: {
    type: ItemTypeWithCount;
    collapsed: boolean;
    pathname: string;
}) {
    const href = `/items/${getItemTypeSlug(type.name)}`;
    const isActive = pathname === href;
    const label = capitalize(type.name);
    const isPro = isProItemType(type.name);

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Link
                            href={href}
                            className={cn(
                                "flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
                                isActive && "bg-muted text-foreground",
                            )}
                        />
                    }
                >
                    <ItemTypeIcon
                        iconName={type.icon}
                        className="size-4"
                        color={type.color}
                    />
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
            href={href}
            className={cn(
                "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted",
                isActive && "bg-muted",
            )}
        >
            <span className="flex items-center gap-2">
                <ItemTypeIcon
                    iconName={type.icon}
                    className="size-4"
                    color={type.color}
                />
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
}

/** One collection row: an icon + name link with a trailing marker, or a tooltip'd icon when collapsed. */
function SidebarCollectionLink({
    collection,
    collapsed,
    trailing,
}: {
    collection: CollectionWithStats;
    collapsed: boolean;
    trailing: React.ReactNode;
}) {
    const href = `/collections/${collection.id}`;

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Link
                            href={href}
                            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        />
                    }
                >
                    <Folder
                        className="size-4"
                        style={{ color: collection.color }}
                    />
                </TooltipTrigger>
                <TooltipContent side="right">{collection.name}</TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Link
            href={href}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted"
        >
            <span className="flex items-center gap-2 truncate">
                <Folder
                    className="size-4 shrink-0"
                    style={{ color: collection.color }}
                />
                <span className="truncate">{collection.name}</span>
            </span>
            {trailing}
        </Link>
    );
}

/** A titled list of collection links (Favorites / Recent); renders nothing when empty. */
function SidebarCollectionGroup({
    label,
    collections,
    collapsed,
    trailing,
}: {
    label: string;
    collections: CollectionWithStats[];
    collapsed: boolean;
    trailing: (collection: CollectionWithStats) => React.ReactNode;
}) {
    if (collections.length === 0) return null;

    return (
        <div className="flex flex-col gap-0.5">
            {!collapsed && (
                <span className="px-2 py-1 text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
                    {label}
                </span>
            )}
            {collections.map((collection) => (
                <SidebarCollectionLink
                    key={collection.id}
                    collection={collection}
                    collapsed={collapsed}
                    trailing={trailing(collection)}
                />
            ))}
        </div>
    );
}

export function Sidebar({
    collapsed = false,
    showCollapseToggle = false,
    itemTypes = [],
    collections = [],
    user = null,
}: {
    collapsed?: boolean;
    showCollapseToggle?: boolean;
    itemTypes?: ItemTypeWithCount[];
    collections?: CollectionWithStats[];
    user?: SidebarUser | null;
}) {
    const { toggleSidebar } = useSidebar();
    const pathname = usePathname();
    const displayName = user?.name?.trim() || user?.email || "Account";
    const favoriteCollections = collections.filter(
        (collection) => collection.isFavorite,
    );
    const recentCollections = collections
        .filter((collection) => !collection.isFavorite)
        .sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
        )
        .slice(0, RECENT_COLLECTIONS_LIMIT);

    return (
        <div className="flex h-full flex-col">
            {showCollapseToggle && (
                <div
                    className={cn(
                        "flex w-full shrink-0 items-center justify-between gap-2 border-b border-border p-2",
                        collapsed && "justify-center",
                    )}
                >
                    {!collapsed && (
                        <span className="px-2 text-sm font-medium text-foreground">
                            Navigation
                        </span>
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
                <nav
                    className={cn(
                        "flex flex-col gap-4 p-3",
                        collapsed && "items-center px-2",
                    )}
                >
                    <SidebarSection title="Types" collapsed={collapsed}>
                        <CollapsibleContent
                            className={cn(
                                !collapsed && "flex flex-col gap-0.5",
                                collapsed && "flex flex-col gap-1",
                            )}
                        >
                            {itemTypes.map((type) => (
                                <SidebarTypeLink
                                    key={type.id}
                                    type={type}
                                    collapsed={collapsed}
                                    pathname={pathname}
                                />
                            ))}
                        </CollapsibleContent>
                    </SidebarSection>

                    <Separator />

                    <SidebarSection title="Collections" collapsed={collapsed}>
                        <CollapsibleContent className="flex flex-col gap-3">
                            <SidebarCollectionGroup
                                label="Favorites"
                                collections={favoriteCollections}
                                collapsed={collapsed}
                                trailing={() => (
                                    <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                                )}
                            />

                            <SidebarCollectionGroup
                                label="Recent"
                                collections={recentCollections}
                                collapsed={collapsed}
                                trailing={(collection) => (
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: collection.color,
                                        }}
                                        aria-hidden
                                    />
                                )}
                            />

                            {!collapsed && (
                                <Link
                                    href="/collections"
                                    className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    View all collections
                                </Link>
                            )}
                        </CollapsibleContent>
                    </SidebarSection>
                </nav>
            </ScrollArea>

            <div
                className={cn(
                    "sticky bottom-0 flex w-full shrink-0 items-center gap-2 border-t border-border bg-sidebar p-3",
                    collapsed && "justify-center px-2",
                )}
            >
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            collapsed ? (
                                <button
                                    type="button"
                                    aria-label="Account menu"
                                    className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                />
                            ) : (
                                <button
                                    type="button"
                                    aria-label="Account menu"
                                    className="flex w-full items-center gap-2 rounded-lg p-1 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                                />
                            )
                        }
                    >
                        <UserAvatar name={displayName} image={user?.image} />
                        {!collapsed && (
                            <>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {displayName}
                                    </p>
                                    {user?.email && (
                                        <p className="truncate text-xs text-muted-foreground">
                                            {user.email}
                                        </p>
                                    )}
                                </div>
                                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                            </>
                        )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="top"
                        align={collapsed ? "start" : "end"}
                        className="w-56"
                    >
                        <div className="flex flex-col gap-0.5 px-1.5 py-1">
                            <span className="text-sm font-medium text-foreground">
                                {displayName}
                            </span>
                            {user?.email && (
                                <span className="text-xs text-muted-foreground">
                                    {user.email}
                                </span>
                            )}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem render={<Link href="/profile" />}>
                            <UserRound />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => signOut({ redirectTo: "/sign-in" })}
                        >
                            <LogOut />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export function SidebarAside({
    itemTypes,
    collections,
    user = null,
}: {
    itemTypes: ItemTypeWithCount[];
    collections: CollectionWithStats[];
    user?: SidebarUser | null;
}) {
    const { collapsed } = useSidebar();

    return (
        <aside
            className={cn(
                "hidden h-full shrink-0 self-stretch border-r border-border transition-[width] duration-200 lg:flex lg:flex-col",
                collapsed ? "w-16" : "w-64",
            )}
        >
            <Sidebar
                collapsed={collapsed}
                showCollapseToggle
                itemTypes={itemTypes}
                collections={collections}
                user={user}
            />
        </aside>
    );
}
