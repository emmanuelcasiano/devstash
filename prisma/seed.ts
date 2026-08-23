import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const systemItemTypes = [
  { name: "snippet", icon: "Code", color: "#3b82f6", isSystem: true },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6", isSystem: true },
  { name: "command", icon: "Terminal", color: "#f97316", isSystem: true },
  { name: "note", icon: "StickyNote", color: "#fde047", isSystem: true },
  { name: "file", icon: "File", color: "#6b7280", isSystem: true },
  { name: "image", icon: "Image", color: "#ec4899", isSystem: true },
  { name: "link", icon: "Link", color: "#10b981", isSystem: true },
];

const DEMO_USER_EMAIL = "demo@devstash.io";

type SeedItemType = "snippet" | "prompt" | "command" | "link";

interface SeedItem {
  title: string;
  type: SeedItemType;
  description: string;
  content?: string;
  url?: string;
  language?: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
}

interface SeedCollection {
  name: string;
  description: string;
  isFavorite?: boolean;
  items: SeedItem[];
}

const collections: SeedCollection[] = [
  {
    name: "React Patterns",
    description: "Reusable React patterns and hooks",
    isFavorite: true,
    items: [
      {
        title: "useDebounce & useLocalStorage Hooks",
        type: "snippet",
        language: "typescript",
        description: "Custom hooks for debouncing values and persisting state to localStorage.",
        tags: ["react", "hooks", "typescript"],
        isPinned: true,
        content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initialValue;
  });

  const setStoredValue = (newValue: T) => {
    setValue(newValue);
    window.localStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, setStoredValue] as const;
}
`,
      },
      {
        title: "Compound Component Pattern (Tabs)",
        type: "snippet",
        language: "typescript",
        description: "Context-based compound component pattern for a Tabs UI.",
        tags: ["react", "patterns"],
        isFavorite: true,
        content: `import { createContext, useContext, useState, type ReactNode } from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabsContext.Provider>
  );
}

export function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("useTabsContext must be used within <Tabs>");
  return context;
}
`,
      },
      {
        title: "Common Utility Functions",
        type: "snippet",
        language: "typescript",
        description: "Small reusable utility functions: classname merging, date formatting, and truncation.",
        content: `export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return \`\${minutes}m ago\`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return \`\${hours}h ago\`;
  const days = Math.floor(hours / 24);
  return \`\${days}d ago\`;
}

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? \`\${text.slice(0, maxLength - 1)}…\` : text;
}
`,
      },
    ],
  },
  {
    name: "AI Workflows",
    description: "AI prompts and workflow automations",
    items: [
      {
        title: "Code Review Prompt",
        type: "prompt",
        description: "Ask an AI to review a diff for bugs and style issues.",
        tags: ["ai", "code-review"],
        isPinned: true,
        isFavorite: true,
        content:
          "Review the following code diff. Identify correctness bugs, edge cases, and any deviations from the project's existing patterns. For each issue, give the file/line, a one-sentence description of the problem, and a concrete fix. Do not suggest stylistic nitpicks unless they affect readability significantly.",
      },
      {
        title: "Documentation Generator",
        type: "prompt",
        description: "Generate docs/comments for a function or module.",
        content:
          "Given the following function, write concise documentation: a one-sentence summary of what it does, its parameters with types, its return value, and any thrown errors or edge cases. Keep it terse — no restating the obvious from well-named identifiers.",
      },
      {
        title: "Refactoring Assistant",
        type: "prompt",
        description: "Get refactor suggestions without changing behavior.",
        content:
          "Review this code for refactoring opportunities: duplicated logic, unclear names, and unnecessary complexity. Propose changes that preserve existing behavior exactly. Explain the reasoning for each suggested change in one sentence.",
      },
    ],
  },
  {
    name: "DevOps",
    description: "Infrastructure and deployment resources",
    items: [
      {
        title: "Dockerfile - Node.js Production Build",
        type: "snippet",
        language: "dockerfile",
        description: "Multi-stage Dockerfile for a production Next.js build.",
        tags: ["docker", "devops", "nextjs"],
        content: `FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
`,
      },
      {
        title: "Deploy to Vercel",
        type: "command",
        language: "bash",
        description: "Deploy the current branch straight to production on Vercel.",
        tags: ["vercel", "deployment"],
        isFavorite: true,
        content: "vercel --prod --yes",
      },
      {
        title: "Docker Documentation",
        type: "link",
        description: "Official Docker documentation.",
        url: "https://docs.docker.com/",
      },
      {
        title: "GitHub Actions Documentation",
        type: "link",
        description: "Official GitHub Actions documentation.",
        url: "https://docs.github.com/en/actions",
      },
    ],
  },
  {
    name: "Terminal Commands",
    description: "Useful shell commands for everyday development",
    isFavorite: true,
    items: [
      {
        title: "Undo Last Commit (Keep Changes)",
        type: "command",
        language: "bash",
        description: "Undo the last commit but keep the changes staged.",
        tags: ["git"],
        isPinned: true,
        content: "git reset --soft HEAD~1",
      },
      {
        title: "Remove All Stopped Docker Containers",
        type: "command",
        language: "bash",
        description: "Clean up stopped containers to free up disk space.",
        content: "docker container prune -f",
      },
      {
        title: "Find Process Using a Port",
        type: "command",
        language: "bash",
        description: "List the process currently bound to port 3000.",
        content: "lsof -i :3000",
      },
      {
        title: "Clean Install Dependencies",
        type: "command",
        language: "bash",
        description: "Wipe node_modules and the lockfile, then reinstall from scratch.",
        content: "rm -rf node_modules package-lock.json && npm install",
      },
    ],
  },
  {
    name: "Design Resources",
    description: "UI/UX resources and references",
    items: [
      {
        title: "Tailwind CSS Documentation",
        type: "link",
        description: "Utility-first CSS framework documentation.",
        tags: ["css", "docs"],
        isFavorite: true,
        url: "https://tailwindcss.com/docs",
      },
      {
        title: "shadcn/ui Components",
        type: "link",
        description: "Accessible, composable React component library.",
        url: "https://ui.shadcn.com",
      },
      {
        title: "Material Design 3",
        type: "link",
        description: "Google's open-source design system.",
        url: "https://m3.material.io",
      },
      {
        title: "Lucide Icons",
        type: "link",
        description: "Open-source icon library.",
        url: "https://lucide.dev",
      },
    ],
  },
];

async function main() {
  console.log("Seeding system item types...");

  for (const type of systemItemTypes) {
    const existing = await prisma.itemType.findFirst({
      where: { name: type.name, userId: null },
    });

    if (!existing) {
      await prisma.itemType.create({ data: type });
    }
  }

  const itemTypes = await prisma.itemType.findMany({ where: { isSystem: true } });
  const itemTypeIdByName = new Map(itemTypes.map((t) => [t.name, t.id]));

  console.log("Seeding demo user...");

  let user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });

  if (!user) {
    const hashedPassword = await bcrypt.hash("12345678", 12);
    user = await prisma.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        name: "Demo User",
        password: hashedPassword,
        isPro: false,
        emailVerified: new Date(),
      },
    });
  }

  console.log("Seeding collections and items...");

  for (const collectionSeed of collections) {
    let collection = await prisma.collection.findFirst({
      where: { name: collectionSeed.name, userId: user.id },
    });

    if (!collection) {
      collection = await prisma.collection.create({
        data: {
          name: collectionSeed.name,
          description: collectionSeed.description,
          isFavorite: collectionSeed.isFavorite ?? false,
          userId: user.id,
        },
      });
    } else {
      collection = await prisma.collection.update({
        where: { id: collection.id },
        data: { isFavorite: collectionSeed.isFavorite ?? false },
      });
    }

    for (const itemSeed of collectionSeed.items) {
      const itemTypeId = itemTypeIdByName.get(itemSeed.type);
      if (!itemTypeId) throw new Error(`Unknown item type: ${itemSeed.type}`);

      let item = await prisma.item.findFirst({
        where: { title: itemSeed.title, userId: user.id },
      });

      if (!item) {
        item = await prisma.item.create({
          data: {
            title: itemSeed.title,
            description: itemSeed.description,
            contentType: itemSeed.type === "link" ? "URL" : "TEXT",
            content: itemSeed.content,
            url: itemSeed.url,
            language: itemSeed.language,
            userId: user.id,
            itemTypeId,
          },
        });
      }

      await prisma.item.update({
        where: { id: item.id },
        data: {
          isPinned: itemSeed.isPinned ?? false,
          isFavorite: itemSeed.isFavorite ?? false,
          tags: {
            connectOrCreate: (itemSeed.tags ?? []).map((tagName) => ({
              where: { name: tagName },
              create: { name: tagName },
            })),
          },
        },
      });

      const existingLink = await prisma.itemCollection.findUnique({
        where: { itemId_collectionId: { itemId: item.id, collectionId: collection.id } },
      });

      if (!existingLink) {
        await prisma.itemCollection.create({
          data: { itemId: item.id, collectionId: collection.id },
        });
      }
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
