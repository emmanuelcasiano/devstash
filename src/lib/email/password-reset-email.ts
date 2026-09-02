import { getEmailFrom, getResend } from "@/lib/email/resend";

interface SendPasswordResetEmailArgs {
  to: string;
  name?: string | null;
  resetUrl: string;
}

/** Escape user-supplied text before interpolating it into the HTML body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the "reset your password" message for an email/password account.
 *
 * Throws if Resend rejects the send so callers can decide how to surface the
 * failure (the forgot-password route logs and still returns success so the
 * endpoint can't be used to probe which emails are registered).
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailArgs): Promise<void> {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const htmlGreeting = escapeHtml(greeting);

  const { error } = await getResend().emails.send({
    from: getEmailFrom(),
    to,
    subject: "Reset your DevStash password",
    text: [
      greeting,
      "",
      "We received a request to reset your DevStash password. Use the link below to choose a new one:",
      resetUrl,
      "",
      "This link expires in 1 hour. If you didn't request a password reset, you can ignore this email — your password won't change.",
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #0f172a;">
        <p>${htmlGreeting}</p>
        <p>We received a request to reset your DevStash password. Choose a new one using the button below.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #6366f1; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; display: inline-block;">
            Reset password
          </a>
        </p>
        <p style="color: #475569; font-size: 13px;">
          Or paste this link into your browser:<br />
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #475569; font-size: 13px;">
          This link expires in 1 hour. If you didn't request a password reset, you can ignore this email — your password won't change.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send password reset email: ${error.message}`);
  }
}
