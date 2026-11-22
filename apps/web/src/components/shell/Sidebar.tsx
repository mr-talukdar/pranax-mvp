'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getInitials, type AppSession } from './AppSession';
import { BrandLogo } from '../brand/BrandLogo';

interface SidebarProps {
  session: AppSession;
  onSignOut: () => void;
  onCloseMobile?: () => void;
}

export function Sidebar({ session, onSignOut, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: 'dashboard',
      active: pathname === '/dashboard',
    },
    {
      name: 'Members',
      href: '/members',
      icon: 'group',
      active: pathname.startsWith('/members'),
    },
    {
      name: 'Attendance',
      href: '/attendance',
      icon: 'schedule',
      active: pathname.startsWith('/attendance'),
    },
    {
      name: 'Retention',
      href: '/retention',
      icon: 'ecg_heart',
      active: pathname.startsWith('/retention'),
    },
    {
      name: 'AI Assistant',
      href: '/assistant',
      icon: 'auto_awesome',
      iconClass: 'text-tertiary',
      active: pathname.startsWith('/assistant'),
    },
  ];

  return (
    <aside className="h-full w-[220px] bg-surface-container-lowest border-r border-outline-variant/40 flex flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="min-h-[76px] px-3 flex items-center justify-between border-b border-outline-variant/30">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex min-w-0 flex-1 items-center group"
          >
            <BrandLogo
              className={`transition-transform group-hover:scale-[1.02] ${
                onCloseMobile ? 'h-[54px] w-[138px]' : 'h-[58px] w-[148px]'
              }`}
            />
          </Link>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-md text-on-surface-variant hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>
          )}
        </div>

        {/* Navigation links */}
        <div className="px-space-md py-space-sm">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`group flex items-center justify-between px-space-sm py-2 rounded-lg font-label-md text-label-md transition-all ${
                    item.active
                      ? 'bg-primary-fixed text-on-primary-fixed-variant font-bold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined shrink-0 text-[19px] ${
                        item.iconClass ?? ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="whitespace-nowrap">{item.name}</span>
                  </div>
                  <div
                    className={`w-1.5 h-1.5 shrink-0 rounded-full bg-primary transition-opacity ${
                      item.active
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer / Account & Studio context */}
      <div className="p-space-md border-t border-outline-variant/30 flex flex-col gap-space-sm bg-surface-container-lowest">
        <Link
          href="/settings"
          onClick={onCloseMobile}
          className={`flex items-center gap-2.5 px-space-sm py-2 rounded-lg font-label-md text-label-md transition-all ${
            pathname.startsWith('/settings')
              ? 'bg-primary-fixed text-on-primary-fixed-variant font-bold'
              : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">
            settings
          </span>
          <span>Settings</span>
        </Link>

        {/* Studio Context Selector Card */}
        <div className="flex items-center justify-between w-full px-space-sm py-2 rounded-lg bg-surface-container text-left border border-border-delicate">
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant leading-none">
              Studio Context
            </span>
            <span className="font-label-md text-label-md text-on-surface font-semibold truncate mt-0.5">
              {session.studio.name}
            </span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
            unfold_more
          </span>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-headline-sm text-headline-sm font-bold shadow-xs">
              {getInitials(session.user.name)}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-secondary-container ring-2 ring-surface-container-lowest" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-semibold text-on-surface truncate leading-tight">
                {session.user.name}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate leading-tight">
                {session.studio.role}
              </span>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
            title="Sign out"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
