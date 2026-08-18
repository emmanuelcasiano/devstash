import { TopBar } from "@/components/layout/TopBar";
import { SidebarAside } from "@/components/layout/Sidebar";
import { SidebarMobile } from "@/components/layout/SidebarMobile";
import { SidebarProvider } from "@/components/layout/sidebar-provider";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <SidebarAside />
          <SidebarMobile />
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
