# Item CRUD Architecture

> Design doc — a unified create/read/update/delete system that serves all 7 item
> types through **one** action file, **one** dynamic route, and shared components
> that adapt by type. Grounded in the patterns already used in this repo
> (`src/lib/db/*` server queries, `{ success, data, error }` returns, `auth()` /
> `getCurrentUserId()` scoping). Documentation only — nothing here is built yet.

Related: [`docs/item-types.md`](./item-types.md) — the 7 types, their icons/colors,
and the `TEXT` / `FILE` / `URL` content classification this design keys off.

---

## 1. Guiding decisions

| Concern              | Decision                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------- |
| Mutations            | **Server Actions** in a single file `src/actions/items.ts` (`"use server"`). Matches `coding-standards.md`: "Use Server Actions for form submissions and simple mutations." No API route — item CRUD needs no webhooks, upload progress, or custom status codes. (File uploads for `file`/`image` will add a route later; see §7.) |
| Reads                | Functions in `src/lib/db/items.ts`, called **directly from server components**. Extends the existing file (`getRecentItems`, `getPinnedItems`, `getItemStats`, `getItemTypesWithCounts`). |
| Routing              | One dynamic segment `src/app/items/[type]/page.tsx`. `type` = the lowercase type name (`snippet`, `prompt`, …), i.e. `getItemTypeSlug(name)`. |
| Type-specific logic  | Lives in **components and one config map**, never in the action. The action is type-agnostic: it validates against a schema and writes columns. Which fields render, which content column is used, and how a card displays are all component concerns. |
| Validation           | Zod schema in `src/lib/validations/item.ts`, shared by the action and (optionally) the client form. **Zod is not yet a dependency** — add `zod` when this is implemented; until then follow the manual-ladder style in `src/app/api/auth/register/route.ts`. |
| Return shape         | `{ success: true, data } | { success: false, error }` from every action, per `coding-standards.md`. Client surfaces `error` via toast. |
| Auth                 | Every action re-checks `getCurrentUserId()` and scopes every write with `where: { id, userId }`. Never trust an id from the client alone. |

---

## 2. File structure

```
src/
├── actions/
│   └── items.ts                 # NEW — "use server"; all item mutations
├── lib/
│   ├── db/
│   │   └── items.ts             # EXTEND — add getItemsByType, getItemById
│   ├── validations/
│   │   └── item.ts              # NEW — Zod schemas (base + per-contentType)
│   └── constants/
│       └── item-types.ts        # EXTEND — add ITEM_TYPE_FIELD_CONFIG, resolveItemTypeSlug
├── app/
│   └── items/
│       └── [type]/
│           └── page.tsx         # NEW — list view for one type
└── components/
    └── items/
        ├── ItemsView.tsx        # server — header + toolbar + list, per type
        ├── ItemList.tsx         # server — maps items → ItemCard, empty state
        ├── ItemCard.tsx         # server — row display, adapts by contentType
        ├── ItemActionsMenu.tsx  # client — edit / delete / pin / favorite
        ├── DeleteItemDialog.tsx # client — AlertDialog → deleteItem action
        ├── ItemFormSheet.tsx    # client — Sheet wrapper; create & edit
        ├── ItemForm.tsx         # client — shared fields + <ContentFields>
        └── content-fields/
            ├── TextContentFields.tsx  # content textarea (+ language for snippet/command)
            ├── UrlContentFields.tsx   # url input (link)
            └── FileContentFields.tsx  # upload (file/image) — Pro, stubbed for now
```

Nothing else moves. `src/components/dashboard/ItemRow.tsx` stays as-is for the
dashboard; `ItemCard.tsx` is its type-aware sibling for the list route. They can
be merged later if they converge.

---

## 3. `/items/[type]` routing

### Slug ↔ type

- Slug is `type.name.toLowerCase()` — already produced by `getItemTypeSlug()` and
  already linked from `Sidebar.tsx` (`/items/${getItemTypeSlug(type.name)}`).
- The 7 valid slugs: `snippet`, `prompt`, `command`, `note`, `file`, `image`,
  `link`.

### Page responsibilities (`app/items/[type]/page.tsx`)

```tsx
export const dynamic = "force-dynamic"; // reads live per-user DB data

export default async function ItemsByTypePage({ params }: PageProps<"/items/[type]">) {
  const { type } = await params;

  // 1. Resolve + validate the type. resolveItemTypeSlug() returns the ItemType
  //    row (id, name, icon, color) or null.
  const itemType = await resolveItemTypeSlug(type);
  if (!itemType) notFound();

  // 2. Pro gate (optional now, required before launch): if isProItemType(type)
  //    and the user is not Pro, render an upsell instead of the list.

  // 3. Fetch this user's items of that type.
  const items = await getItemsByType(itemType.name);

  // 4. Hand off to the shared view.
  return <ItemsView itemType={itemType} items={items} />;
}
```

- `generateStaticParams` is **not** used — the list is per-user and dynamic.
- `notFound()` covers typos and non-slug values.
- Deep-linking to a single item uses a query param (`?item=<id>`) handled by
  `ItemFormSheet`, not a nested `[id]` route — keeps one route, and edit is a
  drawer over the list (consistent with the "Drawer Animations — slide-in for
  item editing" note in `project-overview.md`). A dedicated
  `/items/[type]/[id]/page.tsx` can be added later if a full-page view is wanted.

---

## 4. Where type-specific logic lives

One config map is the single source of per-type behaviour. Everything else reads
from it.

```ts
// src/lib/constants/item-types.ts  (addition)

import type { ContentType } from "@/generated/prisma/client";

interface ItemTypeFieldConfig {
  contentType: ContentType;      // "TEXT" | "FILE" | "URL"
  showLanguage: boolean;         // syntax-highlight language selector
  isPro: boolean;
}

export const ITEM_TYPE_FIELD_CONFIG: Record<string, ItemTypeFieldConfig> = {
  snippet: { contentType: "TEXT", showLanguage: true,  isPro: false },
  prompt:  { contentType: "TEXT", showLanguage: false, isPro: false },
  command: { contentType: "TEXT", showLanguage: true,  isPro: false },
  note:    { contentType: "TEXT", showLanguage: false, isPro: false },
  link:    { contentType: "URL",  showLanguage: false, isPro: false },
  file:    { contentType: "FILE", showLanguage: false, isPro: true  },
  image:   { contentType: "FILE", showLanguage: false, isPro: true  },
};
```

| Consumer            | Uses the config for                                                        |
| ------------------- | ------------------------------------------------------------------------ |
| `ItemForm`          | Picks which `<*ContentFields>` subcomponent to render; shows/hides the language select. |
| `ItemCard`          | Picks the display treatment (text preview vs link vs file meta).          |
| `src/lib/validations/item.ts` | `superRefine` requires the right columns for the item's `contentType`. |
| `page.tsx` Pro gate | `isPro` flag (mirrors the existing `isProItemType()`).                   |

The **action never branches on type**. It receives an already-validated payload
and writes it.

---

## 5. Data layer — `src/lib/db/items.ts` (additions)

Follows the existing conventions in that file exactly: `getCurrentUserId()` guard,
return an empty/neutral value when there is no session, map Prisma rows to a flat
interface.

```ts
export interface ItemDetail extends ItemWithType {
  content: string | null;
  language: string | null;
  url: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  collectionIds: string[];
}

// List view for /items/[type]. Newest first. Optional search over title/description.
export async function getItemsByType(
  typeName: string,
  opts?: { search?: string },
): Promise<ItemWithType[]>;

// Single item for the edit form — ownership-scoped, returns null if not found
// or not owned by the current user.
export async function getItemById(id: string): Promise<ItemDetail | null>;
```

- `getItemsByType` filters `where: { userId, itemType: { name: typeName } }`,
  `include: { itemType: true, tags: true }`, `orderBy: { createdAt: "desc" }`,
  and reuses `toItemWithType`.
- `getItemById` additionally selects the content columns and
  `collections: { select: { collectionId: true } }`.
- No changes needed to `getRecentItems` / `getPinnedItems` / `getItemStats` /
  `getItemTypesWithCounts`; they already power the dashboard and sidebar and will
  reflect new items automatically once `revalidatePath("/dashboard")` runs.

---

## 6. Mutations — `src/actions/items.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/current-user";
import { getItemTypeSlug } from "@/lib/constants/item-types";
import { createItemSchema, updateItemSchema } from "@/lib/validations/item";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Exports

| Action                                   | Purpose                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `createItem(input)`                      | Validate → derive `contentType` from the type → create row → connect tags & collections → revalidate. Returns `{ id }`. |
| `updateItem(id, input)`                  | Ownership check → validate → update columns → **sync** tags & collections (`set`) → revalidate. |
| `deleteItem(id)`                         | Ownership check → `prisma.item.delete` (join rows cascade) → revalidate. |
| `setItemPinned(id, pinned)`             | Tiny toggle used by `ItemActionsMenu` and the dashboard. Ownership-scoped. |
| `setItemFavorite(id, favorite)`         | Same shape as above.                                                 |

### Shared skeleton

```ts
export async function createItem(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be signed in." };

  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data; // { itemTypeId, title, description?, content?, language?, url?, tags[], collectionIds[] }

  try {
    // contentType comes from the type config, not the client:
    const type = await prisma.itemType.findFirst({
      where: { id: data.itemTypeId, OR: [{ userId: null }, { userId }] },
    });
    if (!type) return { success: false, error: "Unknown item type." };
    const { contentType } = ITEM_TYPE_FIELD_CONFIG[type.name];

    const item = await prisma.item.create({
      data: {
        title: data.title,
        description: data.description || null,
        contentType,
        content: contentType === "TEXT" ? data.content : null,
        url: contentType === "URL" ? data.url : null,
        language: data.language || null,
        userId,
        itemTypeId: type.id,
        tags: {
          connectOrCreate: data.tags.map((name) => ({ where: { name }, create: { name } })),
        },
        collections: {
          create: data.collectionIds.map((collectionId) => ({ collectionId })),
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/items/${getItemTypeSlug(type.name)}`);
    data.collectionIds.forEach((id) => revalidatePath(`/collections/${id}`));

    return { success: true, data: { id: item.id } };
  } catch (error) {
    console.error("createItem failed:", error);
    return { success: false, error: "Could not save the item." };
  }
}
```

- `updateItem` opens with
  `const existing = await prisma.item.findFirst({ where: { id, userId } })`;
  `if (!existing) return { success: false, error: "Not found." }` — this is the
  ownership gate, mirroring `change-password` / `delete-account` route style.
- Tag / collection sync on update uses `tags: { set: [], connectOrCreate: [...] }`
  and replaces `ItemCollection` rows (`deleteMany` the ones not in the new set,
  `create` the new ones) inside a `prisma.$transaction`.
- Collection membership is validated to belong to `userId` before connect.
- Every mutation calls `revalidatePath` for `/dashboard`, the type list, and any
  touched collection page.

### Free-tier limit (before launch)

`createItem` is the natural chokepoint for the "50 items / 3 collections" free
cap: after the auth check, `count` the user's items and reject when over the
limit unless `user.isPro`. Deferred — `project-overview.md` says all features are
open during development.

---

## 7. Components

| Component                        | Server/Client | Responsibility                                                                 |
| -------------------------------- | ------------- | --------------------------------------------------------------------------- |
| `ItemsView`                      | Server        | Page shell for one type: heading (type icon + name), count, a "New {Type}" button that opens `ItemFormSheet` with the type preselected, search box, then `<ItemList>`. |
| `ItemList`                       | Server        | Maps `items[]` → `<ItemCard>`. Renders the empty state ("No {type}s yet"). |
| `ItemCard`                       | Server        | One row. Left border + icon tile in `itemType.color` (same visual language as `ItemRow`). Body adapts via `ITEM_TYPE_FIELD_CONFIG[type].contentType`: **TEXT** → clamped code/text preview (syntax highlight when `language` set); **URL** → clickable `url` with external-link affordance; **FILE** → filename + human size + download link. Renders tags, pin/favorite markers, `createdAt`. Hosts `<ItemActionsMenu>`. |
| `ItemActionsMenu`                | Client        | `DropdownMenu` per row: Edit (opens `ItemFormSheet`), Pin/Unpin (`setItemPinned`), Favorite (`setItemFavorite`), Delete (opens `DeleteItemDialog`). Uses `useTransition` for pending state; toasts `error`. |
| `DeleteItemDialog`               | Client        | `AlertDialog` (reuse `components/ui/alert-dialog.tsx`) → `deleteItem(id)` → toast + `router.refresh()`. |
| `ItemFormSheet`                  | Client        | `Sheet` (slide-in). Holds open state + `mode` (`create` \| `edit`). On edit, receives the `ItemDetail` (fetched in a server parent or via the `?item=` param). Renders `<ItemForm>`. |
| `ItemForm`                       | Client        | Controlled fields common to all types — `title`, `description`, `tags` (chip input), `collectionIds` (multi-select of the user's collections). Reads `ITEM_TYPE_FIELD_CONFIG[typeName]` to mount exactly one of the `content-fields/*` subcomponents and to decide whether the language selector shows. Client-side validation mirrors the Zod rules (min title length, URL format, required content). Submits by calling `createItem` / `updateItem`; on `{ success: true }` closes the sheet, toasts, `router.refresh()`. |
| `content-fields/TextContentFields` | Client     | `content` textarea/code editor; optional `language` `<select>` (shown for `snippet`, `command`). |
| `content-fields/UrlContentFields`  | Client     | `url` input with format hint; used by `link`. |
| `content-fields/FileContentFields` | Client     | Upload widget for `file` / `image`. **Stub now** — real impl needs the R2 upload route (`POST /api/upload`) and writes `fileUrl`/`fileName`/`fileSize`; that route is the one place item handling legitimately needs an API route rather than an action (upload progress). |

### Why type logic sits here and not in the action

- The action's contract is stable: "given a valid payload for some type, persist
  it." Adding a custom type (future Pro feature) means adding a
  `ITEM_TYPE_FIELD_CONFIG` entry and — if it needs a novel field — one
  `content-fields/*` component. The action and route are untouched.
- Server components render the list without shipping any of the form/editor JS;
  only the interactive leaves (`ItemActionsMenu`, `ItemFormSheet`, `ItemForm`)
  are client components. This is the "server-rendered pages, small client leaves"
  pattern already used across the dashboard and auth screens.

---

## 8. Request flow summary

**Read** — `GET /items/snippet`
`page.tsx` (server) → `resolveItemTypeSlug("snippet")` → `getItemsByType("snippet")`
(Prisma, scoped to `getCurrentUserId()`) → `ItemsView` → `ItemList` → `ItemCard[]`.
No client JS for the list itself.

**Create** — "New Snippet" in `ItemsView`
`ItemFormSheet` opens (type preselected) → `ItemForm` with `TextContentFields` +
language select → submit → `createItem(payload)` (server action) → Zod validate →
`getCurrentUserId()` → derive `contentType: "TEXT"` from config → `prisma.item.create`
with tags/collections → `revalidatePath("/dashboard")`, `revalidatePath("/items/snippet")`
→ `{ success: true, data: { id } }` → sheet closes, toast, `router.refresh()`.

**Update** — Edit in `ItemActionsMenu`
`getItemById(id)` (ownership-scoped) fills `ItemForm` → `updateItem(id, payload)` →
`findFirst({ where: { id, userId } })` gate → update + `$transaction` tag/collection
sync → revalidate.

**Delete** — `DeleteItemDialog` → `deleteItem(id)` → ownership gate →
`prisma.item.delete` (`ItemCollection` + `ItemTags` rows cascade / auto-disconnect)
→ revalidate.

---

## 9. New dependencies / follow-ups

- **`zod`** — not currently installed; required by `coding-standards.md` for input
  validation. Add it with this feature.
- **`/items/[type]` page does not exist** — the sidebar already links to it, so
  the links are dead until this lands. (Noted in `docs/item-types.md`.)
- **Slug mismatch** — `project-overview.md` documents plural routes
  (`/items/snippets`); the code uses singular (`/items/snippet`). This design
  follows the code. Pick one and align the overview.
- **R2 upload route** for `file` / `image` is out of scope here; `FILE`-type
  create/update is stubbed until it exists.
- **Free-tier item cap** enforcement point is `createItem`; deferred per project
  policy.
