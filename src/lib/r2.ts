import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 access over its S3-compatible API.
 *
 * The client is created lazily and cached on `globalThis` (same pattern as
 * `src/lib/prisma.ts`) so `next dev` HMR doesn't leak sockets. Every helper
 * assumes {@link isR2Configured} is true — callers check that first and return a
 * clear error to the user when storage isn't set up.
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
/** Public base URL for the bucket (r2.dev subdomain or a custom domain). */
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");

export function isR2Configured(): boolean {
    return Boolean(
        R2_ACCOUNT_ID &&
            R2_ACCESS_KEY_ID &&
            R2_SECRET_ACCESS_KEY &&
            R2_BUCKET_NAME &&
            R2_PUBLIC_URL,
    );
}

const globalForR2 = globalThis as unknown as { r2Client?: S3Client };

function getClient(): S3Client {
    if (!isR2Configured()) {
        throw new Error(
            "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_URL.",
        );
    }

    if (!globalForR2.r2Client) {
        globalForR2.r2Client = new S3Client({
            region: "auto",
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID as string,
                secretAccessKey: R2_SECRET_ACCESS_KEY as string,
            },
        });
    }

    return globalForR2.r2Client;
}

/** Absolute, publicly reachable URL for an object key. */
export function buildPublicUrl(key: string): string {
    return `${R2_PUBLIC_URL}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Recovers the object key from a URL previously produced by
 * {@link buildPublicUrl}. Returns `null` for any URL that isn't under the
 * configured public base (e.g. a legacy value or an unrelated link).
 */
export function keyFromPublicUrl(url: string): string | null {
    if (!R2_PUBLIC_URL || !url.startsWith(`${R2_PUBLIC_URL}/`)) return null;
    const encodedKey = url.slice(R2_PUBLIC_URL.length + 1);
    if (!encodedKey) return null;
    try {
        return encodedKey.split("/").map(decodeURIComponent).join("/");
    } catch {
        return null;
    }
}

export async function uploadToR2(input: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
}): Promise<void> {
    await getClient().send(
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: input.key,
            Body: input.body,
            ContentType: input.contentType,
        }),
    );
}

/**
 * Deletes an object. Best-effort: R2 returns success for a missing key, and
 * callers (item deletion) treat a throw as non-fatal.
 */
export async function deleteFromR2(key: string): Promise<void> {
    await getClient().send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
    );
}

export interface R2Object {
    body: Uint8Array;
    contentType: string;
    contentLength: number;
}

/** Fetches an object's bytes for the download proxy. Files are capped at 10 MB,
 *  so buffering the whole body is fine and avoids stream-plumbing edge cases. */
export async function getR2Object(key: string): Promise<R2Object | null> {
    try {
        const result = await getClient().send(
            new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
        );
        if (!result.Body) return null;
        const body = await result.Body.transformToByteArray();
        return {
            body,
            contentType: result.ContentType ?? "application/octet-stream",
            contentLength: result.ContentLength ?? body.byteLength,
        };
    } catch (error) {
        if (
            error instanceof Error &&
            (error.name === "NoSuchKey" || error.name === "NotFound")
        ) {
            return null;
        }
        throw error;
    }
}
