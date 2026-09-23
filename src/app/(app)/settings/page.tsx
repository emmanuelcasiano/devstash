import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getCollectionStats } from "@/lib/db/collections";
import { getItemStats } from "@/lib/db/items";
import { getProfileUser } from "@/lib/db/user";
import { AccountActions } from "@/components/settings/AccountActions";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { EditorPreferencesSettings } from "@/components/settings/EditorPreferencesSettings";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
    title: "Settings · DevStash",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ checkout?: string }>;
}) {
    const session = await auth();
    if (!session?.user) {
        redirect("/sign-in?callbackUrl=/settings");
    }

    const [{ checkout }, user, itemStats, collectionStats] = await Promise.all([
        searchParams,
        getProfileUser(),
        getItemStats(),
        getCollectionStats(),
    ]);

    if (!user) {
        redirect("/sign-in?callbackUrl=/settings");
    }

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
            <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-4" />
                Back to dashboard
            </Link>

            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

            <section className="flex flex-col gap-4">
                <h2 className="text-sm font-medium text-muted-foreground">Editor</h2>
                <Card>
                    <CardContent>
                        <EditorPreferencesSettings />
                    </CardContent>
                </Card>
            </section>

            <section id="billing" className="flex scroll-mt-6 flex-col gap-4">
                <h2 className="text-sm font-medium text-muted-foreground">Billing</h2>
                <Card>
                    <CardContent>
                        <BillingSettings
                            isPro={user.isPro}
                            hasStripeCustomer={user.hasStripeCustomer}
                            itemCount={itemStats.totalItems}
                            collectionCount={collectionStats.totalCollections}
                            checkoutStatus={
                                checkout === "success" || checkout === "canceled"
                                    ? checkout
                                    : undefined
                            }
                        />
                    </CardContent>
                </Card>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="text-sm font-medium text-muted-foreground">Account</h2>
                <Card>
                    <CardContent>
                        <AccountActions email={user.email} hasPassword={user.hasPassword} />
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
