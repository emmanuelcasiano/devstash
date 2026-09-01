import { sendVerificationEmail } from "@/lib/email/verification-email";
import { createEmailVerificationToken } from "@/lib/auth/verification-token";

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
