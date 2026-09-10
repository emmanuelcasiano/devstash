/**
 * Small `fetch` wrapper for the auth client forms, which all POST a JSON body and
 * read a `{ error?: string }` JSON response that may be missing or malformed.
 *
 * Collapses the repeated
 * `const data = (await res.json().catch(() => null)) as { error?: string } | null`
 * dance. `error` carries only the server-provided message (or `null`); callers
 * keep their own fallback copy via `result.error ?? "…"`.
 */
export interface JsonResult<T> {
    ok: boolean;
    status: number;
    data: T | null;
    /** The `error` string from the response body, or `null` on success / when absent. */
    error: string | null;
}

export async function postJson<T extends { error?: string } = { error?: string }>(
    url: string,
    body: unknown,
): Promise<JsonResult<T>> {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = (await response.json().catch(() => null)) as T | null;
        return {
            ok: response.ok,
            status: response.status,
            data,
            error: response.ok ? null : data?.error ?? null,
        };
    } catch {
        return { ok: false, status: 0, data: null, error: null };
    }
}
