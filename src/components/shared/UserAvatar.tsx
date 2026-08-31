import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * Derives up to two uppercase initials from a name
 * (e.g. "Brad Traversy" -> "BT"). Falls back to "?" when there is no name.
 */
export function getUserInitials(name?: string | null): string {
    const parts = (name ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 0) {
        return "?";
    }

    return parts
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

/**
 * Reusable user avatar. Renders the user's image (e.g. from GitHub) when
 * present, otherwise shows initials generated from the name.
 */
export function UserAvatar({
    name,
    image,
    size = "default",
    className,
}: {
    name?: string | null;
    image?: string | null;
    size?: "sm" | "default" | "lg";
    className?: string;
}) {
    return (
        <Avatar size={size} className={className}>
            {image ? <AvatarImage src={image} alt={name ?? "User avatar"} /> : null}
            <AvatarFallback>{getUserInitials(name)}</AvatarFallback>
        </Avatar>
    );
}
