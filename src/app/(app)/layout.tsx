import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarAside } from "@/components/layout/Sidebar";
import { SidebarMobile } from "@/components/layout/SidebarMobile";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { ItemDrawerProvider } from "@/components/items/item-drawer-provider";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { getCollectionOptions, getRecentCollections } from "@/lib/db/collections";
import { getItemTypesWithCounts } from "@/lib/db/items";

export const dynamic = "force-dynamic";

const SIDEBAR_COLLECTIONS_LIMIT = 50;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, itemTypes, collections, collectionOptions] = await Promise.all([
    auth(),
    getItemTypesWithCounts(),
    getRecentCollections(SIDEBAR_COLLECTIONS_LIMIT),
    getCollectionOptions(),
  ]);

  // Defense-in-depth: `/dashboard` protection would otherwise rest solely on the
  // `proxy.ts` matcher. `/profile` and `/items/[type]` self-guard already; this
  // makes the whole `(app)` group refuse to render without a session.
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = session.user;

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar collections={collectionOptions} />
        <div className="flex min-h-0 flex-1">
          <SidebarAside itemTypes={itemTypes} collections={collections} user={user} />
          <SidebarMobile itemTypes={itemTypes} collections={collections} user={user} />
          <main className="flex-1 overflow-y-auto">
            <ItemDrawerProvider>
              <div className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</div>
              <ItemDrawer collections={collectionOptions} />
            </ItemDrawerProvider>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
