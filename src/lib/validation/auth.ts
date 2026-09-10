/**
 * Shared constants for the auth flows (register, sign-in, password reset,
 * change password, verification resend). Kept dependency-free so both the API
 * routes and the client forms can import the exact same rules instead of each
 * re-declaring them.
 */

/** Loose "looks like an email" check — the real validation is the DB + provider. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimum length for any password the app accepts. */
export const MIN_PASSWORD_LENGTH = 8;

/** The user-facing "too short" message, kept identical across every call site. */
export const PASSWORD_LENGTH_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
