// Temporary mock data source for the dashboard UI.
// Replace with real database queries once Prisma + Neon are wired up.

export interface User {
    id: string;
    name: string;
    email: string;
    image: string | null;
    isPro: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ItemType {
    id: string;
    name: string;
    icon: string; // lucide-react icon name
    color: string; // hex color
    isSystem: boolean;
}

export interface Collection {
    id: string;
    name: string;
    description: string;
    color: string; // accent color for card border
    isFavorite: boolean;
    itemCount: number;
}

export interface Item {
    id: string;
    title: string;
    description: string;
    itemTypeId: string;
    collectionIds: string[];
    tags: string[];
    isFavorite: boolean;
    isPinned: boolean;
    createdAt: string;
}

export const mockUser: User = {
    id: "user-1",
    name: "John Doe",
    email: "demo@devstash.io",
    image: null,
    isPro: false,
    createdAt: "2025-11-01",
    updatedAt: "2026-01-15",
};

export const mockItemTypes: ItemType[] = [
    { id: "type-snippet", name: "Snippets", icon: "Code", color: "#3b82f6", isSystem: true },
    { id: "type-prompt", name: "Prompts", icon: "Sparkles", color: "#8b5cf6", isSystem: true },
    { id: "type-command", name: "Commands", icon: "Terminal", color: "#f97316", isSystem: true },
    { id: "type-note", name: "Notes", icon: "StickyNote", color: "#fde047", isSystem: true },
    { id: "type-file", name: "Files", icon: "File", color: "#6b7280", isSystem: true },
    { id: "type-image", name: "Images", icon: "Image", color: "#ec4899", isSystem: true },
    { id: "type-link", name: "Links", icon: "Link", color: "#10b981", isSystem: true },
];

export const mockItemTypesCounts: Record<string, number> = {
    "type-snippet": 24,
    "type-prompt": 18,
    "type-command": 15,
    "type-note": 12,
    "type-file": 5,
    "type-image": 3,
    "type-link": 8,
};

export const mockCollections: Collection[] = [
    {
        id: "collection-react-patterns",
        name: "React Patterns",
        description: "Common React patterns and hooks",
        color: "#3b82f6",
        isFavorite: true,
        itemCount: 12,
    },
    {
        id: "collection-python-snippets",
        name: "Python Snippets",
        description: "Useful Python code snippets",
        color: "#3b82f6",
        isFavorite: false,
        itemCount: 8,
    },
    {
        id: "collection-context-files",
        name: "Context Files",
        description: "AI context files for projects",
        color: "#6b7280",
        isFavorite: true,
        itemCount: 5,
    },
    {
        id: "collection-interview-prep",
        name: "Interview Prep",
        description: "Technical interview preparation",
        color: "#fde047",
        isFavorite: false,
        itemCount: 24,
    },
    {
        id: "collection-git-commands",
        name: "Git Commands",
        description: "Frequently used git commands",
        color: "#f97316",
        isFavorite: true,
        itemCount: 15,
    },
    {
        id: "collection-ai-prompts",
        name: "AI Prompts",
        description: "Curated AI prompts for coding",
        color: "#8b5cf6",
        isFavorite: false,
        itemCount: 18,
    },
];

export const mockItems: Item[] = [
    {
        id: "item-use-auth-hook",
        title: "useAuth Hook",
        description: "Custom authentication hook for React applications",
        itemTypeId: "type-snippet",
        collectionIds: ["collection-react-patterns"],
        tags: ["react", "auth", "hooks"],
        isFavorite: true,
        isPinned: true,
        createdAt: "2026-01-15",
    },
    {
        id: "item-api-error-handling",
        title: "API Error Handling Pattern",
        description: "Fetch wrapper with exponential backoff retry logic",
        itemTypeId: "type-snippet",
        collectionIds: ["collection-react-patterns"],
        tags: ["api", "error-handling"],
        isFavorite: false,
        isPinned: true,
        createdAt: "2026-01-12",
    },
    {
        id: "item-code-review-prompt",
        title: "Code review prompt",
        description: "Detailed AI prompt for thorough code reviews",
        itemTypeId: "type-prompt",
        collectionIds: ["collection-ai-prompts"],
        tags: ["ai", "code-review"],
        isFavorite: false,
        isPinned: false,
        createdAt: "2026-01-10",
    },
    {
        id: "item-git-reset-hard",
        title: "git reset --hard HEAD~1",
        description: "Undo the last commit and discard changes",
        itemTypeId: "type-command",
        collectionIds: ["collection-git-commands"],
        tags: ["git"],
        isFavorite: false,
        isPinned: false,
        createdAt: "2026-01-08",
    },
];
