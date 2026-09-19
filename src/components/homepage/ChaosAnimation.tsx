"use client";

import { useEffect, useRef } from "react";

import { CHAOS_ICONS } from "@/components/homepage/chaos-icons";
import { cn } from "@/lib/utils";

const ICON_SIZE = 52;
const REPEL_RADIUS = 60;
const REPEL_STRENGTH = 2.5;
const MAX_SPEED = 1.4;
const DAMPING = 0.985;

interface FloatingIcon {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    pulsePhase: number;
}

function createIcons(count: number, width: number, height: number): FloatingIcon[] {
    return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return {
            x: width / 2 + Math.cos(angle) * (width / 3) - ICON_SIZE / 2,
            y: height / 2 + Math.sin(angle) * (height / 3) - ICON_SIZE / 2,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 0.4,
            pulsePhase: Math.random() * Math.PI * 2,
        };
    });
}

/**
 * The hero's "your knowledge today..." box: tool icons drift around, bounce
 * off the walls, pulse, and get nudged away from the cursor.
 */
export function ChaosAnimation({ className }: { className?: string }) {
    const boxRef = useRef<HTMLDivElement>(null);
    const areaRef = useRef<HTMLDivElement>(null);
    const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const box = boxRef.current;
        const area = areaRef.current;
        if (!box || !area) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const bounds = { width: area.clientWidth, height: area.clientHeight };
        const mouse = { x: 0, y: 0, active: false };
        const icons = createIcons(CHAOS_ICONS.length, bounds.width, bounds.height);

        function render(frame: number) {
            icons.forEach((icon, i) => {
                const pulse = 1 + Math.sin(frame * 0.02 + icon.pulsePhase) * 0.06;
                const el = iconRefs.current[i];
                if (el) {
                    el.style.transform = `translate(${icon.x}px, ${icon.y}px) rotate(${icon.rotation}deg) scale(${pulse})`;
                }
            });
        }

        function step() {
            for (const icon of icons) {
                icon.x += icon.vx;
                icon.y += icon.vy;

                if (icon.x <= 0 || icon.x >= bounds.width - ICON_SIZE) {
                    icon.vx *= -1;
                    icon.x = Math.max(0, Math.min(icon.x, bounds.width - ICON_SIZE));
                }
                if (icon.y <= 0 || icon.y >= bounds.height - ICON_SIZE) {
                    icon.vy *= -1;
                    icon.y = Math.max(0, Math.min(icon.y, bounds.height - ICON_SIZE));
                }

                if (mouse.active) {
                    const dx = icon.x + ICON_SIZE / 2 - mouse.x;
                    const dy = icon.y + ICON_SIZE / 2 - mouse.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < REPEL_RADIUS && dist > 0.01) {
                        const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_STRENGTH;
                        icon.vx += (dx / dist) * force * 0.04;
                        icon.vy += (dy / dist) * force * 0.04;
                    }
                }

                const speed = Math.hypot(icon.vx, icon.vy);
                if (speed > MAX_SPEED) {
                    icon.vx = (icon.vx / speed) * MAX_SPEED;
                    icon.vy = (icon.vy / speed) * MAX_SPEED;
                }
                icon.vx *= DAMPING;
                icon.vy *= DAMPING;
                icon.rotation += icon.rotationSpeed;
            }
        }

        render(0);
        if (reducedMotion) return;

        const resizeObserver = new ResizeObserver(() => {
            bounds.width = area.clientWidth;
            bounds.height = area.clientHeight;
        });
        resizeObserver.observe(area);

        function onMouseMove(event: MouseEvent) {
            const rect = area!.getBoundingClientRect();
            mouse.x = event.clientX - rect.left;
            mouse.y = event.clientY - rect.top;
            mouse.active = true;
        }
        function onMouseLeave() {
            mouse.active = false;
        }
        box.addEventListener("mousemove", onMouseMove);
        box.addEventListener("mouseleave", onMouseLeave);

        let frame = 0;
        let rafId = requestAnimationFrame(function tick() {
            frame += 1;
            step();
            render(frame);
            rafId = requestAnimationFrame(tick);
        });

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            box.removeEventListener("mousemove", onMouseMove);
            box.removeEventListener("mouseleave", onMouseLeave);
        };
    }, []);

    return (
        <div
            ref={boxRef}
            className={cn(
                "relative h-80 overflow-hidden rounded-2xl border border-border bg-card p-5",
                className,
            )}
        >
            <span className="mb-3.5 block text-center text-xs font-semibold tracking-wide text-muted-foreground">
                Your knowledge today...
            </span>
            <div ref={areaRef} className="relative h-[260px] w-full">
                {CHAOS_ICONS.map(({ id, label, colorClass, Icon }, i) => (
                    <div
                        key={id}
                        ref={(el) => {
                            iconRefs.current[i] = el;
                        }}
                        title={label}
                        className={cn(
                            "absolute top-0 left-0 flex size-[52px] items-center justify-center rounded-xl border border-border bg-muted/60 will-change-transform select-none",
                            colorClass,
                        )}
                    >
                        <Icon className="size-6" />
                    </div>
                ))}
            </div>
        </div>
    );
}
