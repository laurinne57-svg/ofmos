'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Moon01, Sun } from '@untitledui/icons';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon-sm" className="opacity-0"><Sun className="h-4 w-4" /></Button>;
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon01 className="h-4 w-4" />}
    </Button>
  );
}
