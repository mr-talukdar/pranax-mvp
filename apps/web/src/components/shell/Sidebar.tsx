'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TARGET_STUDIO } from '../../lib/constants';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Overview',
      href: '/',
      icon: 'dashboard',
      active: pathname === '/',
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
      badge: '3',
      badgeClass: 'bg-rose-tint text-rose-soft font-semibold',
      active: pathname.startsWith('/retention'),
    },
    {
      name: 'AI Assistant',
      href: '#',
      icon: 'auto_awesome',
      iconClass: 'text-tertiary',
      badge: 'Beta',
      badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed font-semibold uppercase',
      active: false,
    },
  ];

  return (
    <aside className="h-full w-[220px] bg-surface-container-lowest border-r border-outline-variant/40 flex flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="h-16 px-space-md flex items-center justify-between border-b border-outline-variant/30">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-headline-sm shadow-xs group-hover:scale-105 transition-transform">
              P
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight truncate leading-none">
                PranaX
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate mt-0.5">
                Fitness Business OS
              </span>
            </div>
          </Link>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-md text-on-surface-variant hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
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
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[19px] ${
                        item.iconClass ?? ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge ? (
                    <span
                      className={`px-1.5 py-0.5 rounded-full font-label-sm text-label-sm leading-none ${item.badgeClass}`}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <div
                      className={`w-1.5 h-1.5 rounded-full bg-primary transition-opacity ${
                        item.active
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  )}
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
          <span className="material-symbols-outlined text-[19px]">settings</span>
          <span>Settings</span>
        </Link>

        {/* Studio Context Selector Card */}
        <div className="flex items-center justify-between w-full px-space-sm py-2 rounded-lg bg-surface-container text-left border border-border-delicate">
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant leading-none">
              Studio Context
            </span>
            <span className="font-label-md text-label-md text-on-surface font-semibold truncate mt-0.5">
              {TARGET_STUDIO.name}
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
              {TARGET_STUDIO.ownerInitials}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-secondary-container ring-2 ring-surface-container-lowest" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-semibold text-on-surface truncate leading-tight">
                {TARGET_STUDIO.ownerName}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate leading-tight">
                {TARGET_STUDIO.role}
              </span>
            </div>
          </div>
          <button
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
            title="Sign out"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
