import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
    title: "Forgot Password · DevStash",
};

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />;
}
