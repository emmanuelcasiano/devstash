import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getItemById } from "@/lib/db/items";

/**
 * GET /api/items/[id]
 *
 * Returns the full detail of one item for the item drawer. Requires a session
 * and only resolves items owned by the current user; anything else is a 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { id } = await params;
    const item = await getItemById(id);
    if (!item) {
        return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({ item });
}
