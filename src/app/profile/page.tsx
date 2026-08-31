import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { UserAvatar } from "@/components/shared/UserAvatar";

export const metadata: Metadata = {
    title: "Profile · DevStash",
};

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/sign-in?callbackUrl=/profile");
    }

    const { name, email, image } = session.user;

    return (
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 p-6">
            <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-4" />
                Back to dashboard
            </Link>

            <div className="flex items-center gap-4">
                <UserAvatar name={name} image={image} size="lg" />
                <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                        {name ?? "Unnamed user"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{email}</p>
                </div>
            </div>
        </div>
    );
}
