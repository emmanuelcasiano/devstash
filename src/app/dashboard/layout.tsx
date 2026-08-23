import { TopBar } from "@/components/layout/TopBar";
import { SidebarAside } from "@/components/layout/Sidebar";
import { SidebarMobile } from "@/components/layout/SidebarMobile";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { getRecentCollections } from "@/lib/db/collections";
import { getItemTypesWithCounts } from "@/lib/db/items";

export const dynamic = "force-dynamic";

const SIDEBAR_COLLECTIONS_LIMIT = 50;

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const [itemTypes, collections] = await Promise.all([
    getItemTypesWithCounts(),
    getRecentCollections(SIDEBAR_COLLECTIONS_LIMIT),
  ]);

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <SidebarAside itemTypes={itemTypes} collections={collections} />
          <SidebarMobile itemTypes={itemTypes} collections={collections} />
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
