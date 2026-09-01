import { getEmailFrom, getResend } from "@/lib/email/resend";

interface SendVerificationEmailArgs {
  to: string;
  name?: string | null;
  verifyUrl: string;
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
 * Sends the "confirm your email" message for a newly registered account.
 *
 * Throws if Resend rejects the send so callers can decide how to surface the
 * failure (the register route logs and still returns success so the user can
 * request a fresh link later).
 */
export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
}: SendVerificationEmailArgs): Promise<void> {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const htmlGreeting = escapeHtml(greeting);

  const { error } = await getResend().emails.send({
    from: getEmailFrom(),
    to,
    subject: "Verify your DevStash email",
    text: [
      greeting,
      "",
      "Confirm your email address to finish setting up your DevStash account:",
      verifyUrl,
      "",
      "This link expires in 24 hours. If you didn't create a DevStash account, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #0f172a;">
        <p>${htmlGreeting}</p>
        <p>Confirm your email address to finish setting up your DevStash account.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background: #6366f1; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; display: inline-block;">
            Verify email
          </a>
        </p>
        <p style="color: #475569; font-size: 13px;">
          Or paste this link into your browser:<br />
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color: #475569; font-size: 13px;">
          This link expires in 24 hours. If you didn't create a DevStash account, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send verification email: ${error.message}`);
  }
}
