import type { ZodError } from "zod";

import { auth } from "@/auth";

/**
 * Shared helpers for the `"use server"` action files. This module is a plain
 * (non-`"use server"`) module on purpose: a `"use server"` file may only export
 * async functions, so the `ActionResult` type and `GENERIC_ERROR` constant live
 * here and are imported by `items.ts`, `collections.ts`, etc.
 */

/**
 * The result shape every server action in this project returns: a discriminated
 * union so the caller can branch on `success` and get either typed `data` or a
 * ready-to-display `error` string.
 */
export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * Resolves the signed-in user's id, or an `{ error }` describing the failed
 * action (`verb` is folded into "You must be signed in to <verb>.").
 */
export async function requireUserId(
    verb: string,
): Promise<{ userId: string } | { error: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: `You must be signed in to ${verb}.` };
    }
    return { userId: session.user.id };
}

/** Flattens a Zod error into the project's single-string `error` message. */
export function zodMessage(error: ZodError): string {
    return (
        error.issues.map((issue) => issue.message).join(" ") || "Invalid input."
    );
}

export const GENERIC_ERROR = "Something went wrong. Please try again.";
