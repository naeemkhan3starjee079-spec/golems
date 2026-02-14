import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { MobileNav } from "@/components/mobile-nav";
import { SearchOverlay } from "@/components/search-overlay";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
      <SearchOverlay />
    </div>
  );
}
