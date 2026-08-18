"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 1024;

interface SidebarContextValue {
    collapsed: boolean;
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener("change", update);
        return () => mql.removeEventListener("change", update);
    }, []);

    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setMobileOpen((open) => !open);
        } else {
            setCollapsed((value) => !value);
        }
    }, [isMobile]);

    return (
        <SidebarContext.Provider value={{ collapsed, mobileOpen, setMobileOpen, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const ctx = useContext(SidebarContext);
    if (!ctx) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return ctx;
}
