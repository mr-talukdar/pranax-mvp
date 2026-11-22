import type { ReactNode } from 'react';

export const metadata = {
  title: 'Sign in or create a studio workspace',
  description: 'Sign in to PranaX or create a private workspace for your studio.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
