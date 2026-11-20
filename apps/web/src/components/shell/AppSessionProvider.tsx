'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppSessionContext,
  AppSessionStatusContext,
  type AppSession,
} from './AppSession';

interface AppSessionProviderProps {
  children: ReactNode;
}

function isWorkspaceRoute(pathname: string): boolean {
  return (
    pathname !== '/' && pathname !== '/auth' && !pathname.startsWith('/auth/')
  );
}

export function AppSessionProvider({ children }: AppSessionProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);
  const sessionRef = useRef<AppSession | null>(null);
  const [loading, setLoading] = useState(() => isWorkspaceRoute(pathname));
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const clear = useCallback(() => {
    sessionRef.current = null;
    setSession(null);
  }, []);

  useEffect(() => {
    if (!isWorkspaceRoute(pathname)) {
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(sessionRef.current === null);
    setError(null);

    async function loadSession() {
      try {
        const response = await globalThis.fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (response.status === 401) {
          sessionRef.current = null;
          setSession(null);
          router.replace('/auth');
          return;
        }

        const result = (await response.json()) as {
          data?: AppSession;
          error?: string;
        };
        if (controller.signal.aborted) return;
        if (!response.ok || !result.data) {
          throw new Error(
            result.error || 'Workspace details could not be loaded.',
          );
        }

        sessionRef.current = result.data;
        setSession(result.data);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Workspace details could not be loaded.',
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSession();
    return () => controller.abort();
  }, [pathname, refreshKey, router]);

  return (
    <AppSessionStatusContext.Provider value={{ loading, error, refresh, clear }}>
      <AppSessionContext.Provider value={session}>
        {children}
      </AppSessionContext.Provider>
    </AppSessionStatusContext.Provider>
  );
}
