import React from 'react';
import { darkTheme } from '../../design-tokens';
import { cn } from '../../utils/cn';

interface DarkPageProps {
  className?: string;
  children: React.ReactNode;
}

export const DarkPage: React.FC<DarkPageProps> = ({ className, children }) => {
  const darkStyles = { ...(darkTheme as React.CSSProperties), colorScheme: 'dark' as const };
  return (
    <div
      className={cn('relative bg-transparent text-foreground', className)}
      style={darkStyles}
    >
      {children}
    </div>
  );
};

export default DarkPage;
