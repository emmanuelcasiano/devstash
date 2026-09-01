import { Resend } from "resend";

/**
 * Shared Resend client. Server-only — never import this from a client component.
 *
 * `RESEND_API_KEY` and `EMAIL_FROM` are read lazily so a missing key surfaces a
 * clear error at send time rather than at module load.
 */
const globalForResend = globalThis as unknown as { resend?: Resend };

export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env (see .env.example).",
    );
  }

  globalForResend.resend ??= new Resend(apiKey);
  return globalForResend.resend;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "DevStash <onboarding@resend.dev>";
}
