'use client';

import Link from 'next/link';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

type AuthMode = 'create' | 'signin';
type DemoCredentials = { email: string; password: string };

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoCredentials, setDemoCredentials] =
    useState<DemoCredentials | null>(null);

  useEffect(() => {
    const callbackError = new URLSearchParams(globalThis.location.search).get(
      'error',
    );
    if (callbackError) {
      setError(
        callbackError === 'workspace'
          ? 'Your account was confirmed, but we could not open its workspace. Please sign in to continue.'
          : 'That confirmation link could not be used. Sign in or request a new confirmation email.',
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    globalThis
      .fetch('/demo-credentials.json', { cache: 'force-cache' })
      .then(async (response) => {
        if (!response.ok) return null;
        const value = (await response.json()) as Partial<DemoCredentials>;
        if (
          typeof value.email !== 'string' ||
          typeof value.password !== 'string'
        ) {
          return null;
        }
        return { email: value.email, password: value.password };
      })
      .then((value) => {
        if (active && value) setDemoCredentials(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const endpoint = mode === 'create' ? '/api/auth/signup' : '/api/auth/login';
    const payload =
      mode === 'create'
        ? { fullName, studioName, email, password }
        : { email, password };

    try {
      const response = await globalThis.fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        data?: { needsEmailConfirmation?: boolean };
        error?: string;
      };

      if (response.status === 202 && result.data?.needsEmailConfirmation) {
        setNotice(
          'Check your email to confirm your account. The link will create your empty studio workspace and take you to the dashboard.',
        );
        return;
      }
      if (!response.ok) {
        throw new Error(
          result.error || 'We could not complete sign-in. Please try again.',
        );
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'We could not complete sign-in. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  return (
    <main className="min-h-screen bg-[#f7f9ff] text-[#172033]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="PranaX home"
        >
          <BrandLogo className="h-[54px] w-[138px] sm:h-[60px] sm:w-[154px]" />
          <span className="hidden flex-col justify-center self-center border-l border-slate-200 pl-3 text-[10px] font-semibold uppercase leading-4 tracking-[0.14em] text-slate-500 sm:flex">
            <span>Fitness</span>
            <span>Business OS</span>
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
        >
          Back to overview
        </Link>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pt-14">
        <section className="max-w-lg">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold text-blue-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Your studio, your workspace
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl">
            Start with a clean slate.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Create a private PranaX workspace for your studio. New accounts
            begin empty, with no demo members, attendance, or retention data.
          </p>
          <div className="mt-8 space-y-4">
            {[
              ['lock', 'Your records stay in your studio workspace.'],
              ['person_add', 'Add members when you are ready.'],
              [
                'insights',
                'Retention insights appear as your studio adds history.',
              ],
            ].map(([icon, text]) => (
              <div
                key={text}
                className="flex items-center gap-3 text-sm font-medium text-slate-700"
              >
                <span className="material-symbols-outlined flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                  {icon}
                </span>
                {text}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-45px_rgba(22,54,114,0.4)] sm:p-9">
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              {mode === 'create'
                ? 'Create your workspace'
                : 'Sign in to PranaX'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {mode === 'create'
                ? 'Start with your own empty studio workspace.'
                : 'Use your studio account or the synthetic demo credentials shared with you.'}
            </p>
          </div>

          <div
            className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1"
            role="tablist"
            aria-label="Authentication options"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'create'}
              onClick={() => changeMode('create')}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === 'create' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Create account
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => changeMode('signin')}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === 'signin' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Demo / sign in
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-800"
            >
              {notice}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'create' && (
              <>
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Your name
                  </label>
                  <input
                    id="fullName"
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="studioName"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Studio name
                  </label>
                  <input
                    id="studioName"
                    required
                    maxLength={120}
                    value={studioName}
                    onChange={(event) => setStudioName(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="e.g. Northside Pilates"
                  />
                </div>
              </>
            )}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="you@yourstudio.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === 'create' ? 'new-password' : 'current-password'
                }
                required
                minLength={mode === 'create' ? 8 : 1}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder={
                  mode === 'create' ? 'At least 8 characters' : 'Your password'
                }
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0757d5] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {busy
                ? 'Please wait…'
                : mode === 'create'
                  ? 'Create workspace'
                  : 'Sign in'}
              {!busy && (
                <span className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          {mode === 'signin' && (
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-950">
              <p className="font-bold">Synthetic demo account</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-x-4">
                <dt className="font-semibold text-blue-900">Email</dt>
                <dd className="break-all font-mono text-xs">
                  {demoCredentials?.email ?? 'Demo credentials unavailable'}
                </dd>
                <dt className="font-semibold text-blue-900">Password</dt>
                <dd className="break-all font-mono text-xs">
                  {demoCredentials?.password ?? 'Demo credentials unavailable'}
                </dd>
              </dl>
              <button
                type="button"
                disabled={!demoCredentials}
                onClick={() => {
                  if (!demoCredentials) return;
                  setEmail(demoCredentials.email);
                  setPassword(demoCredentials.password);
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0757d5] px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">
                  login
                </span>
                Fill demo sign-in
              </button>
              <p className="mt-3 text-xs leading-5 text-blue-900">
                This is a shared synthetic workspace. Changes made here are
                visible to other demo users.
              </p>
            </div>
          )}
          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            By continuing, you agree to use member information responsibly and
            only for your studio.
          </p>
        </section>
      </div>
    </main>
  );
}
