import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildPublicUrl, isR2Configured, uploadToR2 } from "@/lib/r2";
import {
    isUploadKind,
    sanitizeFileName,
    validateUpload,
} from "@/lib/validation/upload";

/**
 * POST /api/upload
 *
 * Accepts a `multipart/form-data` body with `file` (the binary) and `kind`
 * (`"file"` or `"image"`), stores it in R2 under `uploads/<userId>/<uuid>/<name>`,
 * and returns `{ fileUrl, fileName, fileSize }` for the "New Item" dialog to
 * submit with `createItem`. An API route (not a Server Action) so the client can
 * track upload progress via `XMLHttpRequest`.
 */
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "You must be signed in to upload files." },
            { status: 401 },
        );
    }

    if (!isR2Configured()) {
        return NextResponse.json(
            { error: "File uploads are not configured." },
            { status: 503 },
        );
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json(
            { error: "Expected a multipart form upload." },
            { status: 400 },
        );
    }

    const file = formData.get("file");
    const kind = formData.get("kind");

    if (!(file instanceof File)) {
        return NextResponse.json(
            { error: "No file was provided." },
            { status: 400 },
        );
    }

    if (!isUploadKind(kind)) {
        return NextResponse.json(
            { error: "Unknown upload type." },
            { status: 400 },
        );
    }

    const validation = validateUpload({
        kind,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
    });
    if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const safeName = sanitizeFileName(file.name);
    const key = `uploads/${session.user.id}/${randomUUID()}/${safeName}`;

    try {
        await uploadToR2({
            key,
            body: Buffer.from(await file.arrayBuffer()),
            contentType: file.type || "application/octet-stream",
        });
    } catch (error) {
        console.error("Failed to upload to R2:", error);
        return NextResponse.json(
            { error: "Upload failed. Please try again." },
            { status: 500 },
        );
    }

    return NextResponse.json(
        {
            fileUrl: buildPublicUrl(key),
            fileName: file.name,
            fileSize: file.size,
        },
        { status: 201 },
    );
}
