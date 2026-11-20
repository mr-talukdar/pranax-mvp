'use client';

import { getInitials, type AppSession } from './AppSession';

interface HeaderProps {
  session: AppSession;
  onToggleSidebar?: () => void;
  title?: string;
}

export function Header({ session, onToggleSidebar, title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-surface-container-lowest/90 backdrop-blur-xl border-b border-border-delicate px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-space-md">
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-2">
          {title && (
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {title}
            </span>
          )}
        </div>

        {/* Live Studio Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-sage-tint border border-sage-border">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span className="font-label-sm text-label-sm font-semibold text-secondary">
            Live • {session.studio.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Help / Docs */}
        <div className="hidden md:flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md">
          <span className="material-symbols-outlined text-[18px]">
            calendar_today
          </span>
          <span>Today</span>
        </div>

        {/* User Avatar Action */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-label-md cursor-pointer hover:opacity-90 shadow-xs">
          {getInitials(session.user.name)}
        </div>
      </div>
    </header>
  );
}
