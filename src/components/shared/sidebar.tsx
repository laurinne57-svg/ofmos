'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import {
  BarChart01,
  BookOpen01,
  Eye,
  FileShield02,
  Film02,
  Home01,
  Image03,
  LogOut01,
  MagicWand02,
  MessageChatCircle,
  Settings01,
  Share07,
  Target04,
  Users01,
  VideoRecorder,
} from '@untitledui/icons';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const navSections = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home01 },
    ],
  },
  {
    label: 'SOURCING',
    items: [
      { label: 'Models', href: '/models', icon: Users01 },
      { label: 'Templates', href: '/templates', icon: MessageChatCircle },
      { label: 'Questionnaires', href: '/questionnaires', icon: BookOpen01 },
    ],
  },
  {
    label: 'KNOWLEDGE',
    items: [
      { label: 'Niches', href: '/niches', icon: Target04 },
      { label: 'Différenciants', href: '/differenciants', icon: MagicWand02 },
      { label: 'Competitors', href: '/competitors', icon: Eye },
    ],
  },
  {
    label: 'PRODUCTION',
    items: [
      { label: 'Accounts', href: '/accounts', icon: Share07 },
      { label: 'Content', href: '/content', icon: Film02 },
      { label: 'Création', href: '/creation', icon: MagicWand02 },
      { label: 'AI Studio', href: '/ai-studio', icon: Image03 },
      { label: 'Video Tools', href: '/video-tools', icon: VideoRecorder },
      { label: 'Cleaner', href: '/cleaner', icon: FileShield02 },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart01 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-blue shadow-sm">
          <span className="text-sm font-bold text-white">O</span>
        </div>
        <Link href="/dashboard" className="text-base font-bold tracking-tight text-sidebar-foreground">
          OFM-OS
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 pt-1 pb-3">
        <nav className="flex flex-col gap-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
                      )}
                      <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70')} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
            pathname === '/settings'
              ? 'bg-primary/10 text-primary'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          )}
        >
          <Settings01 className="h-[18px] w-[18px]" />
          Settings
        </Link>
        <div className="flex items-center justify-between px-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2.5 text-sidebar-foreground/70 hover:text-sidebar-foreground text-[13px] font-medium"
            onClick={handleLogout}
          >
            <LogOut01 className="h-[18px] w-[18px]" />
            Logout
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
