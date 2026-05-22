import { MobileSidebar } from '@/components/shared/mobile-sidebar';
import { Sidebar } from '@/components/shared/sidebar';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b border-border px-4 md:hidden">
          <MobileSidebar />
          <div className="ml-2 flex h-7 w-7 items-center justify-center rounded-md gradient-blue shadow-sm">
            <span className="text-xs font-bold text-white">O</span>
          </div>
          <span className="ml-2 text-sm font-bold">OFM-OS</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
