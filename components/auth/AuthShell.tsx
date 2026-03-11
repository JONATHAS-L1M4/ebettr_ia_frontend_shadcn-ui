import React from 'react';
import { darkTheme } from '../../design-tokens';
import { cn } from '../../utils/cn';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({
  title,
  subtitle,
  children,
}) => {
  const darkStyles = { ...(darkTheme as React.CSSProperties), colorScheme: 'dark' as const };
  return (
    <div className={cn('relative min-h-screen bg-transparent text-foreground')} style={darkStyles}>
      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:px-6">
        <div className="w-full">
          <img
            src="http://img.ebettr.com/images/2026/03/06/logotipo.png"
            alt="Ebettr IA"
            className="mx-auto mb-8 h-12 w-auto brightness-0 invert sm:h-18"
          />

          <div className="w-full rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-[0_30px_100px_-55px_rgba(0,0,0,1)] sm:p-8">
            {title && (
              <div className="text-center">
                <h1 className="text-2xl font-semibold leading-tight tracking-[-0.04em] text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
