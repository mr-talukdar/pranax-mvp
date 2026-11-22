import Link from 'next/link';
import { BrandLogo } from '../components/brand/BrandLogo';

export const metadata = {
  title: 'Studio Management Software for Pilates & Yoga Studios',
  description:
    'Run your Pilates, yoga, or boutique fitness studio with one workspace for member management, attendance tracking, memberships, and explainable retention signals.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Studio Management Software for Pilates & Yoga Studios | PranaX',
    description:
      'Manage members, attendance, memberships, and retention signals in one practical workspace for boutique fitness studios.',
    url: '/',
  },
};

const capabilities = [
  {
    title: 'Know every member',
    description:
      'Keep member profiles, contact details, memberships, and visit history together in one studio workspace.',
    iconSvg: (
      <svg
        className="h-6 w-6 text-blue-700"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.8"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Make attendance useful',
    description:
      'Record check-ins or import attendance history, then see visit patterns without stitching spreadsheets together.',
    iconSvg: (
      <svg
        className="h-6 w-6 text-blue-700"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.8"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
        />
      </svg>
    ),
  },
  {
    title: 'Act on retention signals',
    description:
      'Surface explainable member risk scores and a clear next action based on attendance and membership evidence.',
    iconSvg: (
      <svg
        className="h-6 w-6 text-blue-700"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.8"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 12h2.25l1.5-3 2.25 6 1.5-3h2.25"
        />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9ff] text-[#172033]">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
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
        <nav
          className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex"
          aria-label="Main navigation"
        >
          <a href="#platform" className="transition hover:text-blue-700">
            Platform
          </a>
          <a href="#workflow" className="transition hover:text-blue-700">
            How it works
          </a>
          <a href="#studios" className="transition hover:text-blue-700">
            For studios
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/auth"
            className="rounded-xl bg-[#0757d5] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-700"
          >
            Get a Demo
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 md:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:pb-28">
        <div className="pointer-events-none absolute -right-48 -top-24 h-[36rem] w-[36rem] rounded-full bg-blue-200/40 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-2 text-xs font-semibold text-blue-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />A calmer way
            to run your studio
          </div>
          <h1 className="max-w-2xl text-5xl font-bold leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.4rem]">
            More time for people.{' '}
            <span className="text-[#0757d5]">
              More clarity for your studio.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            PranaX brings member operations, attendance, memberships, and
            retention signals into one practical workspace for Pilates, yoga,
            and boutique fitness teams.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0757d5] px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Get a Demo{' '}
              <span className="material-symbols-outlined text-lg">
                arrow_forward
              </span>
            </Link>
            <a
              href="#platform"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            >
              Explore the platform
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-emerald-600">
                check_circle
              </span>
              Studio-scoped workspaces
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-emerald-600">
                check_circle
              </span>
              Explainable retention triage
            </span>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-xl">
          <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-blue-200/70 via-white to-violet-100/80 blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.6rem] border border-white bg-white p-5 shadow-[0_30px_100px_-35px_rgba(26,57,117,0.35)] sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Studio overview
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                  A clearer view of your day
                </h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                Live workspace
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 py-5">
              {[
                ['Members', 'Roster'],
                ['Visits', 'Attendance'],
                ['Signals', 'Retention'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3 sm:p-4">
                  <span className="block text-lg font-bold text-slate-900 sm:text-2xl">
                    {value}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-[#f4f7ff] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Member attention queue
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Evidence-led outreach priorities
                  </p>
                </div>
                <span className="material-symbols-outlined rounded-lg bg-white p-2 text-blue-700 shadow-sm">
                  insights
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  [
                    'Attendance has slowed',
                    'Review recent visit pattern',
                    'bg-amber-100',
                  ],
                  [
                    'Membership renewal due',
                    'Reach out before expiry',
                    'bg-rose-100',
                  ],
                  [
                    'Steady attendance',
                    'Keep the momentum going',
                    'bg-emerald-100',
                  ],
                ].map(([title, detail, color]) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {detail}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-base text-slate-400">
                      chevron_right
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-slate-400">
              Illustrative product preview
            </p>
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="border-y border-slate-200/70 bg-white/75 py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              One studio workspace
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              The operational picture, all in one place.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Spend less time piecing together what is happening and more time
              giving members a reason to return.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {capabilities.map((capability) => (
              <article
                key={capability.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  {capability.iconSvg}
                </span>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {capability.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {capability.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="workflow"
        className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Built around your flow
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            From a member’s first visit to the next meaningful action.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            PranaX connects everyday studio records to useful signals. Retention
            scores are operational priorities with visible evidence, not
            promises of churn prediction.
          </p>
        </div>
        <div className="space-y-3">
          {[
            ['01', 'Register members and track memberships'],
            ['02', 'Record check-ins or import attendance history'],
            ['03', 'Review explainable risk signals and recommendations'],
            ['04', 'Use the studio dashboard to focus the team'],
          ].map(([number, label]) => (
            <div
              key={number}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                {number}
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {label}
              </span>
              <span className="material-symbols-outlined ml-auto text-slate-400">
                arrow_forward
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="studios" className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[1.75rem] bg-[#0d1b36] px-7 py-10 text-white sm:px-10 md:flex-row md:items-center md:py-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
              Make your studio easier to understand
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              See what your members need next.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Create a clean workspace for your studio or sign in with the
              synthetic demo account shared with you.
            </p>
          </div>
          <Link
            href="/auth"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#12356f] transition hover:bg-blue-50"
          >
            Get a Demo{' '}
            <span className="material-symbols-outlined text-lg">
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t border-slate-200 bg-white px-5 py-7 text-center text-xs text-slate-500 sm:px-8">
        <BrandLogo className="h-[47px] w-[120px]" />
        <span>PranaX · Fitness Business OS for boutique studios</span>
      </footer>
    </main>
  );
}
