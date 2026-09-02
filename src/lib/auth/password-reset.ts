import { sendPasswordResetEmail } from "@/lib/email/password-reset-email";
import { createPasswordResetToken } from "@/lib/auth/password-reset-token";
import { getAppBaseUrl } from "@/lib/auth/verification";

interface IssuePasswordResetArgs {
  email: string;
  name?: string | null;
  request: Request;
}

/**
 * Issues a fresh password-reset token for `email` and emails the reset link.
 * Any outstanding reset token for the address is replaced. The link points at
 * the `/reset-password` page (not an API route) so the user lands on the form.
 */
export async function issueAndSendPasswordResetEmail({
  email,
  name,
  request,
}: IssuePasswordResetArgs): Promise<void> {
  const token = await createPasswordResetToken(email);
  const resetUrl = `${getAppBaseUrl(request)}/reset-password?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail({ to: email, name, resetUrl });
}
