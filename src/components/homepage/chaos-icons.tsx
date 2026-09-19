import { Bookmark, FileText, Terminal, AppWindow } from "lucide-react";

import { GitHubIcon } from "@/components/auth/GitHubIcon";

/**
 * The scattered "tools" that float around in the hero's chaos box. Brand marks
 * (Notion, Slack, VS Code) are inline SVGs because lucide-react has no brand
 * icons; the rest are generic lucide icons.
 */

function NotionIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986C23.28 4.395 24 4.628 24 5.42v16.573c0 1.454-.56 2.334-2.334 2.427l-15.5.933c-.984.047-1.454-.093-1.98-.746L1.244 20.79C.66 20.045.4 19.484.4 18.83V3.007c0-.84.373-1.548 1.536-1.968z" />
        </svg>
    );
}

function SlackIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path
                d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
                fill="#E01E5A"
            />
            <path
                d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
                fill="#36C5F0"
            />
            <path
                d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
                fill="#2EB67D"
            />
            <path
                d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
                fill="#ECB22E"
            />
        </svg>
    );
}

function VsCodeIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
        </svg>
    );
}

interface ChaosIcon {
    id: string;
    label: string;
    colorClass: string;
    Icon: React.ComponentType<{ className?: string }>;
}

export const CHAOS_ICONS: ChaosIcon[] = [
    { id: "notion", label: "Notion", colorClass: "text-zinc-100", Icon: NotionIcon },
    { id: "github", label: "GitHub", colorClass: "text-zinc-400", Icon: GitHubIcon },
    { id: "slack", label: "Slack", colorClass: "", Icon: SlackIcon },
    { id: "vscode", label: "VS Code", colorClass: "text-blue-500", Icon: VsCodeIcon },
    { id: "tabs", label: "Browser Tabs", colorClass: "text-amber-500", Icon: AppWindow },
    { id: "terminal", label: "Terminal", colorClass: "text-green-500", Icon: Terminal },
    { id: "textfile", label: "Text File", colorClass: "text-slate-500", Icon: FileText },
    { id: "bookmark", label: "Bookmark", colorClass: "text-pink-500", Icon: Bookmark },
];
