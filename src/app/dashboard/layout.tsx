import { auth } from "@/auth";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarAside } from "@/components/layout/Sidebar";
import { SidebarMobile } from "@/components/layout/SidebarMobile";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { getRecentCollections } from "@/lib/db/collections";
import { getItemTypesWithCounts } from "@/lib/db/items";

export const dynamic = "force-dynamic";

const SIDEBAR_COLLECTIONS_LIMIT = 50;

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const [session, itemTypes, collections] = await Promise.all([
    auth(),
    getItemTypesWithCounts(),
    getRecentCollections(SIDEBAR_COLLECTIONS_LIMIT),
  ]);

  const user = session?.user ?? null;

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <SidebarAside itemTypes={itemTypes} collections={collections} user={user} />
          <SidebarMobile itemTypes={itemTypes} collections={collections} user={user} />
          <main className="flex-1 overflow-y-auto p-4">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
