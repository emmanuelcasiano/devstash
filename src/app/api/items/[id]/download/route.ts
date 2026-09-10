import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getItemById } from "@/lib/db/items";
import { getR2Object, isR2Configured, keyFromPublicUrl } from "@/lib/r2";
import { sanitizeFileName } from "@/lib/validation/upload";

/**
 * GET /api/items/[id]/download
 *
 * Streams the R2 object backing a file/image item through the server so the
 * browser never talks to the storage host directly (avoids CORS and lets us
 * force a download). Requires a session and only resolves items owned by the
 * current user; anything else is a 404.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Not authenticated." },
            { status: 401 },
        );
    }

    if (!isR2Configured()) {
        return NextResponse.json(
            { error: "File storage is not configured." },
            { status: 503 },
        );
    }

    const { id } = await params;
    const item = await getItemById(id);
    if (!item || !item.fileUrl) {
        return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const key = keyFromPublicUrl(item.fileUrl);
    if (!key) {
        return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    let object;
    try {
        object = await getR2Object(key);
    } catch (error) {
        console.error(`Failed to fetch R2 object for item ${id}:`, error);
        return NextResponse.json(
            { error: "Could not retrieve the file." },
            { status: 502 },
        );
    }

    if (!object) {
        return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const downloadName = sanitizeFileName(item.fileName ?? key);

    return new Response(object.body as BodyInit, {
        status: 200,
        headers: {
            "Content-Type": object.contentType,
            "Content-Length": String(object.contentLength),
            "Content-Disposition": `attachment; filename="${downloadName}"`,
            "Cache-Control": "private, no-store",
        },
    });
}
