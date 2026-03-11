import React from 'react';
import { SidebarTrigger } from '../ui/sidebar';

export const Header: React.FC = () => {
  return (
    <header className="mt-2 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2 h-10 w-10 text-muted-foreground hover:bg-accent hover:text-foreground" />
        <div>
          <img
            src="http://img.ebettr.com/images/2026/03/06/logotipo.png"
            alt="Ebettr IA"
            className="h-6 w-auto object-contain brightness-0 invert"
          />
        </div>
      </div>
    </header>
  );
};
