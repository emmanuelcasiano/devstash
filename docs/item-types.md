# Item Types

> Research doc — generated from `context/project-overview.md`, `prisma/schema.prisma`,
> `src/lib/constants/item-types.ts`, and `prisma/seed.ts`. Documentation only.

DevStash has **7 system item types**. They are immutable, shared across all users
(`isSystem: true`, `userId: null`), and created idempotently by `prisma/seed.ts`.
Every item references exactly one type via `Item.itemTypeId`, and the type carries
the icon + color used to render that item everywhere in the UI.

---

## The 7 Types

| Type    | `icon` (Lucide) | Hex color            | `ContentType` | Purpose                                                        |
| ------- | --------------- | -------------------- | ------------- | ------------------------------------------------------------- |
| snippet | `Code`          | `#3b82f6` (blue)     | `TEXT`        | Reusable code blocks / boilerplate, syntax-highlighted        |
| prompt  | `Sparkles`      | `#8b5cf6` (purple)   | `TEXT`        | AI prompts, system messages, workflow instructions            |
| command | `Terminal`      | `#f97316` (orange)   | `TEXT`        | Shell / CLI commands to copy and run                          |
| note    | `StickyNote`    | `#fde047` (yellow)   | `TEXT`        | Free-form Markdown notes, explanations, course notes          |
| file    | `File`          | `#6b7280` (gray)     | `FILE`        | Uploaded documents (context files, templates). **Pro-only**   |
| image   | `Image`         | `#ec4899` (pink)     | `FILE`        | Uploaded images / screenshots. **Pro-only**                   |
| link    | `Link`          | `#10b981` (emerald)  | `URL`         | Bookmarked URLs — docs, references, tools                     |

Source of truth for icon/color is the `systemItemTypes` array in `prisma/seed.ts`;
the same table appears in `context/project-overview.md`.

### Per-type key fields

All types share the base `Item` columns (below). What differs is which
content-bearing columns are populated:

| Type    | Populated content fields                          | Notes                                                        |
| ------- | ------------------------------------------------ | ----------------------------------------------------------- |
| snippet | `content`, `language`                            | `language` drives syntax highlighting (e.g. `typescript`, `dockerfile`) |
| prompt  | `content`                                        | No `language`                                               |
| command | `content`, `language` (`bash` in seed data)      | Short one-liners                                            |
| note    | `content`                                        | Markdown; no items seeded yet                              |
| file    | `fileUrl`, `fileName`, `fileSize`                | Cloudflare R2 URL + original filename + byte size. Not implemented yet |
| image   | `fileUrl`, `fileName`, `fileSize`                | Same as file. Not implemented yet                          |
| link    | `url`, `description`                             | `url` is the destination; `content` unused                 |

---

## Content classification: TEXT vs FILE vs URL

The `ContentType` enum (`prisma/schema.prisma`) has three values and groups the 7
types by how their payload is stored:

```prisma
enum ContentType {
  TEXT   // content is inline text in Item.content
  FILE   // content is an uploaded blob referenced by Item.fileUrl
  URL    // content is an external link in Item.url
}
```

| `ContentType` | Types                              | Storage column(s)                    |
| ------------- | --------------------------------- | ----------------------------------- |
| `TEXT`        | snippet, prompt, command, note   | `Item.content` (`@db.Text`), plus optional `Item.language` |
| `FILE`        | file, image                      | `Item.fileUrl`, `Item.fileName`, `Item.fileSize` (R2)      |
| `URL`         | link                             | `Item.url`                          |

`contentType` is set per item, not per type, but in practice it is derived from the
type. `prisma/seed.ts` does this explicitly:

```ts
contentType: itemSeed.type === "link" ? "URL" : "TEXT"
```

> **Implementation status:** only snippet / prompt / command / link have seeded
> data and app support today. `note` has a type row but zero items. `file` and
> `image` (both `FILE`) are Pro-only and not yet wired to uploads — no code path
> currently writes `contentType: "FILE"` or the `fileUrl` / `fileName` / `fileSize`
> columns.

---

## Shared properties

### `Item` model (all types)

| Field         | Type          | Notes                                             |
| ------------- | ------------- | ------------------------------------------------ |
| `id`          | `String` cuid | PK                                               |
| `title`       | `String`      | Required for every type                          |
| `contentType` | `ContentType` | `TEXT` / `FILE` / `URL` (see above)              |
| `content`     | `String?`     | `@db.Text` — TEXT types                          |
| `fileUrl`     | `String?`     | FILE types (R2 URL)                              |
| `fileName`    | `String?`     | FILE types (original filename)                   |
| `fileSize`    | `Int?`        | FILE types (bytes)                               |
| `url`         | `String?`     | URL type                                         |
| `description` | `String?`     | `@db.Text` — optional for all types             |
| `isFavorite`  | `Boolean`     | default `false` — powers favorites + stats      |
| `isPinned`    | `Boolean`     | default `false` — pins item to top of dashboard |
| `language`    | `String?`     | Syntax-highlighting hint (snippet / command)     |
| `createdAt` / `updatedAt` | `DateTime` | timestamps                            |
| `userId`      | `String` FK   | owner; `onDelete: Cascade`                       |
| `itemTypeId`  | `String` FK   | the type                                         |
| `tags`        | `Tag[]`       | many-to-many via `ItemTags` relation            |
| `collections` | `ItemCollection[]` | many-to-many with collections              |

Indexes: `@@index([userId])`, `@@index([itemTypeId])`, `@@index([createdAt])`.

### `ItemType` model

| Field      | Type       | Notes                                                       |
| ---------- | ---------- | --------------------------------------------------------- |
| `id`       | `String` cuid | PK                                                     |
| `name`     | `String`   | lowercase singular (`snippet`, `prompt`, …)               |
| `icon`     | `String`   | Lucide component name, resolved via `ITEM_TYPE_ICONS`     |
| `color`    | `String`   | hex string, used inline for borders / icon tints          |
| `isSystem` | `Boolean`  | `true` for all 7; user-defined custom types would be `false` |
| `userId`   | `String?`  | `null` for system types; set for custom types (future)    |

Unique constraint: `@@unique([name, userId])` — a user can't have two types with
the same name, and system types (`userId: null`) are globally unique by name.

Custom (user-created) types are a planned **Pro** feature and are not implemented;
only the 7 system rows exist.

---

## Display differences

The type's `icon` and `color` are the only per-type rendering inputs; there is no
type-specific layout. Resolution helpers live in
`src/lib/constants/item-types.ts`:

- `ITEM_TYPE_ICONS` — maps the stored icon name string (`"Code"`, `"Sparkles"`, …)
  to the Lucide component. `getItemTypeIcon(name)` falls back to `Code`.
- `getItemTypeSlug(name)` — `name.toLowerCase()`, used for routing.
- `PRO_ITEM_TYPES` = `Set(["file", "image"])`; `isProItemType(name)` gates the
  "PRO" badge.
- `<ItemTypeIcon iconName color className />` (`src/components/shared/ItemTypeIcon.tsx`)
  renders the resolved icon with `style={{ color }}`.

How each surface uses it:

| Surface                                   | Type-driven rendering                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `ItemRow` (dashboard recent / pinned)     | Left border `borderLeftColor: color`; 36px icon tile with `backgroundColor: color + "1a"` (~10% alpha); icon tinted `color`. Pin + favorite icons shown conditionally. Tags rendered as secondary badges. |
| `CollectionCard`                          | Row of distinct type icons for the types present in that collection; card left border color = the collection's most-used type color (`CollectionWithStats.color`). |
| `Sidebar` Types list                      | One link per system type to `/items/{slug}`, with the type icon + live per-user item count; `file` / `image` get a muted uppercase `PRO` badge (collapsed rail shows `· PRO` in the tooltip instead). |
| `StatsCards` / profile "Items by type"    | Aggregates over types; profile lists all 7 including zero counts, each with its colored icon. |

### Routing

`Sidebar.tsx` builds `href = /items/${getItemTypeSlug(type.name)}` → e.g.
`/items/snippet`, `/items/prompt`, `/items/link`.

> **Discrepancy:** `context/project-overview.md` lists plural routes
> (`/items/snippets`, `/items/prompts`, …). The implemented code uses the
> **singular** slug (`/items/snippet`). The `/items/[type]` page itself does not
> exist yet, so the sidebar links are currently dead.

---

## Seed data coverage

`prisma/seed.ts` seeds 18 items across 5 collections, using only 4 of the 7 types
(`SeedItemType = "snippet" | "prompt" | "command" | "link"`):

| Type    | Seeded items | Example                                        |
| ------- | ------------ | -------------------------------------------- |
| snippet | 5            | "useDebounce & useLocalStorage Hooks", Dockerfile |
| prompt  | 3            | "Code Review Prompt", "Documentation Generator" |
| command | 5            | `git reset --soft HEAD~1`, `vercel --prod --yes` |
| link    | 6            | Tailwind docs, shadcn/ui, Lucide Icons        |
| note    | 0            | type row only                                 |
| file    | 0            | Pro-only, not implemented                     |
| image   | 0            | Pro-only, not implemented                     |

Seeded items also exercise `language` (`typescript`, `dockerfile`, `bash`),
`isPinned`, `isFavorite`, and the `tags` relation.
