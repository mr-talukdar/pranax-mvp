'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AppSessionContext, type AppSession } from './AppSession';

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setSessionError(null);
    try {
      const response = await globalThis.fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.status === 401) {
        router.replace('/auth');
        return;
      }
      const result = (await response.json()) as {
        data?: AppSession;
        error?: string;
      };
      if (!response.ok || !result.data) {
        throw new Error(
          result.error || 'Workspace details could not be loaded.',
        );
      }
      setSession(result.data);
    } catch (error) {
      setSessionError(
        error instanceof Error
          ? error.message
          : 'Workspace details could not be loaded.',
      );
    }
  }, [router]);

  useEffect(() => {
    try {
      globalThis.localStorage.removeItem('pranax_demo_token');
    } catch {
      // Browser storage may be unavailable; cookie auth does not depend on it.
    }
    void loadSession();
  }, [loadSession]);

  async function signOut() {
    await globalThis
      .fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      .catch(() => undefined);
    router.replace('/');
    router.refresh();
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6fc] px-5">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          {sessionError ? (
            <>
              <p className="font-semibold text-slate-900">
                Workspace unavailable
              </p>
              <p className="mt-2 text-sm text-slate-600">{sessionError}</p>
              <button
                type="button"
                onClick={() => void loadSession()}
                className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </>
          ) : (
            <p className="text-sm font-medium text-slate-600">
              Opening your PranaX workspace…
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <AppSessionContext.Provider value={session}>
      <div className="min-h-screen bg-[#F4F6FC] flex">
        {/* Desktop Fixed Sidebar */}
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar session={session} onSignOut={signOut} />
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-[240px] w-full bg-surface-container-lowest z-10 shadow-xl">
              <Sidebar
                session={session}
                onSignOut={signOut}
                onCloseMobile={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:pl-[220px] w-full min-w-0 min-h-screen">
          <Header
            session={session}
            onToggleSidebar={() => setMobileOpen(true)}
            title={title}
          />
          <main className="px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </AppSessionContext.Provider>
  );
}
