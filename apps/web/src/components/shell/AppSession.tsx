'use client';

import { createContext, useContext } from 'react';

export type AppSession = {
  user: { id: string; email: string; name: string };
  studio: {
    id: string;
    name: string;
    timezone: string;
    isSynthetic: boolean;
    role: 'OWNER' | 'MANAGER';
    readOnly: boolean;
  };
};

export const AppSessionContext = createContext<AppSession | null>(null);

export type AppSessionStatus = {
  loading: boolean;
  error: string | null;
  refresh: () => void;
  clear: () => void;
};

export const AppSessionStatusContext = createContext<AppSessionStatus>({
  loading: false,
  error: null,
  refresh: () => undefined,
  clear: () => undefined,
});

export function useAppSession(): AppSession {
  const session = useContext(AppSessionContext);
  if (!session) {
    throw new Error('Workspace session is not available.');
  }
  return session;
}

export function useOptionalAppSession(): AppSession | null {
  return useContext(AppSessionContext);
}

export function useAppSessionStatus(): AppSessionStatus {
  return useContext(AppSessionStatusContext);
}

export function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || 'PX';
}
