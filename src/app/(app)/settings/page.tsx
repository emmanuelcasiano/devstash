import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getProfileUser } from "@/lib/db/user";
import { AccountActions } from "@/components/settings/AccountActions";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
    title: "Settings · DevStash",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/sign-in?callbackUrl=/settings");
    }

    const user = await getProfileUser();

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
