import { sendVerificationEmail } from "@/lib/email/verification-email";
import { createEmailVerificationToken } from "@/lib/auth/verification-token";

/**
 * Whether newly registered accounts must confirm their email address before they
 * can sign in with a password.
 *
 * Enabled by default. Set `EMAIL_VERIFICATION_ENABLED="false"` to turn the whole
 * flow off — new accounts are usable immediately and no link is sent. This is
 * useful while Resend has no verified domain and can only deliver to the account
 * owner. Any value other than the literal string `"false"` — including an unset
 * var — leaves verification on, so production stays safe if the var is forgotten.
 *
 * This is the single source of truth; every code path that branches on
 * verification (the register route, the credentials `authorize`, the resend
 * route) reads it from here.
 */
export function isEmailVerificationEnabled(): boolean {
  return process.env.EMAIL_VERIFICATION_ENABLED !== "false";
}

/**
 * Absolute base URL for links embedded in emails. Prefers the explicit `APP_URL`
 * env var and falls back to the origin of the incoming request.
 */
export function getAppBaseUrl(request: Request): string {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  return configured || new URL(request.url).origin;
}

interface IssueVerificationArgs {
  email: string;
  name?: string | null;
  request: Request;
}

/**
 * Issues a fresh verification token for `email` and emails the confirmation
 * link. Any outstanding token for the address is replaced.
 */
export async function issueAndSendVerificationEmail({
  email,
  name,
  request,
}: IssueVerificationArgs): Promise<void> {
  const token = await createEmailVerificationToken(email);
  const verifyUrl = `${getAppBaseUrl(request)}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail({ to: email, name, verifyUrl });
}
