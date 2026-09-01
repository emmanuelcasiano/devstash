# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — run ESLint (`eslint-config-next` core-web-vitals + typescript rules)

There is no test setup in this repo yet.

## Neon MCP

When using the Neon MCP for this project, always target:

- **Organization:** `EC` (`org-cold-shadow-23686148`) — required as `org_id` for `list_projects`
- **Project:** `devstash` (`falling-morning-43209755`)
- **Branch:** `development` (`br-mute-feather-axce0ux5`) — pass this as `branch_id` on every
  `run_sql` / `run_sql_transaction` / schema-inspection call

**Never** run any query or command against the `production` branch
(`br-round-river-ax4u7j0v`, the default/primary branch) unless I explicitly say
"production" in my request. Because production is the Neon default branch, always
pass the `development` branch id explicitly rather than relying on the default.

Never run destructive SQL or destructive Neon tools without asking first.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
