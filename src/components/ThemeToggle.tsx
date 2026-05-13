'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/src/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn("w-10 h-10 rounded-full bg-secondary", className)} />;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn("w-10 h-10 rounded-full bg-secondary text-muted flex items-center justify-center hover:text-foreground transition-colors relative shadow-sm", className)}
      title="Toggle Theme"
    >
      <Sun size={20} className="scale-100 dark:scale-0 transition-transform absolute" />
      <Moon size={20} className="scale-0 dark:scale-100 transition-transform absolute" />
    </button>
  );
}
