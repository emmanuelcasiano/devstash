import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FolderKanban, Package } from "lucide-react";

import { auth } from "@/auth";
import { getProfileUser } from "@/lib/db/user";
import { getItemStats, getItemTypesWithCounts } from "@/lib/db/items";
import { getCollectionStats } from "@/lib/db/collections";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import { formatLongDate } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ProfileAccountActions } from "@/components/profile/ProfileAccountActions";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
    title: "Profile · DevStash",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/sign-in?callbackUrl=/profile");
    }

    const [user, itemStats, collectionStats, itemTypeCounts] = await Promise.all([
        getProfileUser(),
        getItemStats(),
        getCollectionStats(),
        getItemTypesWithCounts(),
    ]);

    if (!user) {
        redirect("/sign-in?callbackUrl=/profile");
    }

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 p-6">
            <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-4" />
                Back to dashboard
            </Link>

            {/* User info */}
            <section className="flex items-center gap-4">
                <UserAvatar name={user.name} image={user.image} size="lg" />
                <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                        {user.name ?? "Unnamed user"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Member since {formatLongDate(user.createdAt)}
                    </p>
                </div>
            </section>

            {/* Usage stats */}
            <section className="flex flex-col gap-4">
                <h2 className="text-sm font-medium text-muted-foreground">Usage</h2>

                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="flex items-center gap-3">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                                style={{ backgroundColor: "#3b82f61a" }}
                            >
                                <Package className="size-5" style={{ color: "#3b82f6" }} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-2xl font-semibold text-foreground">
                                    {itemStats.totalItems}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    Total Items
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                                style={{ backgroundColor: "#8b5cf61a" }}
                            >
                                <FolderKanban
                                    className="size-5"
                                    style={{ color: "#8b5cf6" }}
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-2xl font-semibold text-foreground">
                                    {collectionStats.totalCollections}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    Collections
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="flex flex-col gap-1">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Items by type
                        </p>
                        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                            {itemTypeCounts.map((type) => {
                                const Icon = getItemTypeIcon(type.icon);
                                return (
                                    <li
                                        key={type.id}
                                        className="flex items-center justify-between gap-2 py-1"
                                    >
                                        <span className="flex items-center gap-2 text-sm capitalize text-foreground">
                                            <Icon
                                                className="size-4 shrink-0"
                                                style={{ color: type.color }}
                                            />
                                            {type.name}
                                        </span>
                                        <span className="text-sm tabular-nums text-muted-foreground">
                                            {type.count}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
            </section>

            {/* Account actions */}
            <section className="flex flex-col gap-4">
                <h2 className="text-sm font-medium text-muted-foreground">Account</h2>
                <Card>
                    <CardContent>
                        <ProfileAccountActions
                            email={user.email}
                            hasPassword={user.hasPassword}
                        />
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
