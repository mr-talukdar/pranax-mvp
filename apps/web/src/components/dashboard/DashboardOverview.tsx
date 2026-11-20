'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardKPIs, PrototypeState } from '../../lib/types';
import { TARGET_STUDIO } from '../../lib/constants';
import { fetchDashboardData } from '../../lib/api';

const EMPTY_DASHBOARD_KPIS: DashboardKPIs = {
  activeMembers: 0,
  totalMembers: 0,
  newRegistrations: 0,
  attendanceToday: 0,
  highRiskCount: 0,
  expiringIn7Days: 0,
  membershipBreakdown: {
    active: 0,
    activePercent: 0,
    paused: 0,
    pausedPercent: 0,
    expiring: 0,
    expiringPercent: 0,
    expired: 0,
    expiredPercent: 0,
  },
  attendanceTrends: [],
  retentionSummary: {
    lowCount: 0,
    lowPercent: 0,
    mediumCount: 0,
    mediumPercent: 0,
    highCount: 0,
    highPercent: 0,
    limitedCount: 0,
    limitedPercent: 0,
  },
  attentionQueue: [],
};

interface DashboardOverviewProps {
  initialData?: DashboardKPIs;
}

export function DashboardOverview({
  initialData,
}: DashboardOverviewProps) {
  const [state, setState] = useState<PrototypeState>(initialData ? 'active' : 'loading');
  const [trendMode, setTrendMode] = useState<'daily' | 'monthly'>('daily');
  const [data, setData] = useState<DashboardKPIs>(initialData ?? EMPTY_DASHBOARD_KPIS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = () => {
    setState('loading');
    setErrorMessage(null);
    fetchDashboardData()
      .then((result) => {
        setData(result);
        setState('active');
      })
      .catch((err) => {
        console.error('Failed to load dashboard data', err);
        setErrorMessage(
          err instanceof Error ? err.message : 'Studio telemetries could not synchronize with the cloud database.',
        );
        setState('error');
      });
  };

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setState('active');
    } else {
      loadData();
    }
  }, [initialData]);

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto">
      {/* Interactive Prototype Environment Toolbar */}
      <div className="w-full bg-surface-card border border-border-delicate px-4 py-2.5 rounded-xl shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline text-[18px]">
            tune
          </span>
          <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-text-muted">
            Prototype Environment States
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['active', 'Active Studio (Default)'],
              ['empty', 'Empty First-Use'],
              ['loading', 'Loading Skeleton'],
              ['partial', 'Partial Data'],
              ['error', 'Error State'],
              ['no_ml', 'ML Retention Hidden'],
            ] as const
          ).map(([key, label]) => {
            const isActive = state === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setState(key)}
                className={`px-3 py-1 rounded-lg font-label-sm text-label-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error View Banner */}
      {state === 'error' && (
        <div className="w-full bg-error-container text-on-error-container p-space-lg rounded-xl mb-space-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px]">cloud_off</span>
            <div>
              <p className="font-headline-sm text-headline-sm font-bold">
                Failed to load studio analytics
              </p>
              <p className="font-body-md text-body-md opacity-90">
                {errorMessage || 'Studio telemetries could not synchronize with the cloud database. Please retry or check connection.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-error text-on-error font-label-md text-label-md font-semibold hover:opacity-95 shadow-xs transition-opacity shrink-0"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Page Header & Top Action Controls */}
      <div className="w-full mb-space-lg flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              Overview
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{TARGET_STUDIO.name} • {TARGET_STUDIO.branch}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-sage-tint border border-sage-border text-secondary font-label-sm text-label-sm font-medium">
              Live Remote Database • Active Studio
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            A clear summary of your studio's activity and member health.
          </p>
        </div>

        {/* Quick Context Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-surface-container-lowest rounded-lg shadow-xs text-on-surface-variant font-label-md text-label-md border border-border-delicate">
            <span className="material-symbols-outlined text-[16px]">
              calendar_today
            </span>
            <span className="font-medium text-on-surface">Jun 25, 2026</span>
            <span className="text-on-surface-variant">• Today</span>
          </div>
          <Link
            href="/attendance"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-xs border border-border-delicate"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">
              event_available
            </span>
            <span>Record Attendance</span>
          </Link>
          <Link
            href="/members/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>+ Add Member</span>
          </Link>
        </div>
      </div>

      {/* SKELETON LOADING VIEW */}
      {state === 'loading' && (
        <div className="flex flex-col gap-space-lg w-full animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-surface-container-high rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            <div className="lg:col-span-4 h-72 bg-surface-container-high rounded-xl" />
            <div className="lg:col-span-8 h-72 bg-surface-container-high rounded-xl" />
          </div>
          <div className="h-80 bg-surface-container-high rounded-xl" />
        </div>
      )}

      {/* EMPTY FIRST-USE VIEW */}
      {state === 'empty' && (
        <div className="w-full bg-surface-container-lowest p-12 rounded-xl shadow-xs text-center flex flex-col items-center justify-center min-h-[460px] border border-border-delicate">
          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-primary mb-space-md">
            <span className="material-symbols-outlined text-[36px]">
              fitness_center
            </span>
          </div>
          <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-2">
            Welcome to PranaX!
          </h3>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mb-space-lg">
            Your studio workspace is clean and ready. Start by adding your first studio member or logging class visits to unlock live retention triage and attendance analytics.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-space-sm">
            <Link
              href="/members/new"
              className="flex items-center gap-1.5 px-space-md py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>
              <span>Add Your First Member</span>
            </Link>
            <Link
              href="/attendance"
              className="px-space-md py-2.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors"
            >
              Log Demo Check-In
            </Link>
          </div>
        </div>
      )}

      {/* ACTIVE & PARTIAL VIEWS */}
      {(state === 'active' || state === 'partial' || state === 'no_ml') && (
        <div className="flex flex-col gap-space-lg w-full">
          {/* Top 5 KPI Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-space-md">
            {/* 1. Active Members */}
            <Link
              href="/members"
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-text-muted font-medium">
                  Active Members
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">group</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-metric-lg text-metric-lg font-bold text-on-surface">
                    {state === 'partial' ? 42 : data.activeMembers}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-muted">
                    members
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted truncate mt-1">
                  Out of {state === 'partial' ? 50 : data.totalMembers} total registered
                </p>
              </div>
            </Link>

            {/* 2. New Registrations */}
            <Link
              href="/members?filter=new"
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-text-muted font-medium">
                  New Registrations
                </span>
                <div className="w-8 h-8 rounded-lg bg-sage-tint flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-metric-lg text-metric-lg font-bold text-on-surface">
                    {state === 'partial' ? 3 : data.newRegistrations}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-sage-tint text-secondary font-label-sm text-label-sm font-semibold">
                    new
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted truncate mt-1">
                  Selected period (June 2026)
                </p>
              </div>
            </Link>

            {/* 3. Attendance Today */}
            <Link
              href="/attendance"
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-text-muted font-medium">
                  Attendance Today
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">event_seat</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-metric-lg text-metric-lg font-bold text-on-surface">
                    {state === 'partial' ? 8 : data.attendanceToday}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-muted">
                    unique members
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted truncate mt-1">
                  Across 6 reformer & mat blocks
                </p>
              </div>
            </Link>

            {/* 4. High-Risk Members */}
            <Link
              href="/retention"
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-text-muted font-medium">
                  High-Risk Members
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-tint flex items-center justify-center text-rose-soft group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-metric-lg text-metric-lg font-bold text-rose-soft">
                    {state === 'partial' ? 1 : data.highRiskCount}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-tint text-rose-text font-label-sm text-label-sm font-medium">
                    triaged
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted truncate mt-1">
                  Requires immediate outreach
                </p>
              </div>
            </Link>

            {/* 5. Expiring in 7 Days */}
            <Link
              href="/members?filter=expiring"
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-text-muted font-medium">
                  Expiring in 7 Days
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-outline group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">
                    notification_important
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-metric-lg text-metric-lg font-bold text-on-surface">
                    {state === 'partial' ? 2 : data.expiringIn7Days}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-muted">
                    renewals
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted truncate mt-1">
                  Due by July 2, 2026
                </p>
              </div>
            </Link>
          </div>

          {/* Section: Membership Status Breakdown & Attendance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Membership Status (4 cols) */}
            <div className="lg:col-span-4 bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      badge
                    </span>
                    <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                      Membership Status
                    </h2>
                  </div>
                  <span className="font-label-sm text-label-sm text-text-muted font-medium">
                    {data.totalMembers} Total
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted mb-space-lg">
                  Live active status breakdown across ARS Pilates rosters.
                </p>

                {/* Status Segmented Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-surface-container-low overflow-hidden flex gap-0.5 mb-space-lg">
                  <div
                    className="h-full bg-secondary"
                    style={{ width: `${data.membershipBreakdown.activePercent}%` }}
                    title={`Active: ${data.membershipBreakdown.activePercent}%`}
                  />
                  <div
                    className="h-full bg-outline-variant"
                    style={{ width: `${data.membershipBreakdown.pausedPercent}%` }}
                    title={`Paused: ${data.membershipBreakdown.pausedPercent}%`}
                  />
                  <div
                    className="h-full bg-tertiary-container"
                    style={{ width: `${data.membershipBreakdown.expiringPercent}%` }}
                    title={`Expiring: ${data.membershipBreakdown.expiringPercent}%`}
                  />
                  <div
                    className="h-full bg-error"
                    style={{ width: `${data.membershipBreakdown.expiredPercent}%` }}
                    title={`Expired: ${data.membershipBreakdown.expiredPercent}%`}
                  />
                </div>

                {/* Breakdown List */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-bright border border-border-delicate">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      <span className="font-label-md text-label-md text-on-surface font-medium">
                        Active Memberships
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {data.membershipBreakdown.active}
                      </span>
                      <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-sage-tint text-secondary font-semibold">
                        {data.membershipBreakdown.activePercent}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-bright border border-border-delicate">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-outline-variant" />
                      <span className="font-label-md text-label-md text-on-surface font-medium">
                        Paused (Medical / Travel)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {data.membershipBreakdown.paused}
                      </span>
                      <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-surface-container text-on-surface-variant font-medium">
                        {data.membershipBreakdown.pausedPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-bright border border-border-delicate">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-tertiary-container" />
                      <span className="font-label-md text-label-md text-on-surface font-medium">
                        Expiring Soon (Next 7d)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {data.membershipBreakdown.expiring}
                      </span>
                      <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed font-medium">
                        {data.membershipBreakdown.expiringPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-bright border border-border-delicate">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-soft" />
                      <span className="font-label-md text-label-md text-on-surface font-medium">
                        Expired Memberships
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {data.membershipBreakdown.expired}
                      </span>
                      <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-rose-tint text-rose-text font-medium">
                        {data.membershipBreakdown.expiredPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-space-lg mt-space-md">
                <Link
                  href="/members"
                  className="inline-flex items-center gap-1 font-label-md text-label-md font-semibold text-primary hover:text-primary-container transition-colors"
                >
                  <span>View All Memberships</span>
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>

            {/* Attendance Trends (8 cols) */}
            <div className="lg:col-span-8 bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between border border-border-delicate">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        show_chart
                      </span>
                      <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        Attendance Trends
                      </h2>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Unique member studio check-ins across operating calendar days.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Daily / Monthly toggle */}
                    <div className="flex bg-surface-container p-0.5 rounded-lg text-on-surface-variant font-label-sm text-label-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => setTrendMode('daily')}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          trendMode === 'daily'
                            ? 'bg-surface-container-lowest text-primary shadow-xs'
                            : 'hover:text-on-surface'
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendMode('monthly')}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          trendMode === 'monthly'
                            ? 'bg-surface-container-lowest text-primary shadow-xs'
                            : 'hover:text-on-surface'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                    <span className="px-2.5 py-1 bg-surface-container-low rounded-lg font-label-sm text-label-sm text-on-surface-variant">
                      Jun 1 - Jun 25, 2026
                    </span>
                  </div>
                </div>

                {/* Inline SVG Chart */}
                <div className="w-full h-56 relative pt-4 pb-2">
                  <svg
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                    viewBox="0 0 760 180"
                  >
                    <defs>
                      <linearGradient
                        id="attendanceGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#0053cd"
                          stopOpacity="0.22"
                        />
                        <stop
                          offset="100%"
                          stopColor="#0053cd"
                          stopOpacity="0.00"
                        />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guide Lines */}
                    <line stroke="#E3E9F3" strokeWidth="1" x1="40" x2="750" y1="160" y2="160" />
                    <line stroke="#E3E9F3" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="750" y1="125" y2="125" />
                    <line stroke="#E3E9F3" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="750" y1="90" y2="90" />
                    <line stroke="#E3E9F3" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="750" y1="55" y2="55" />
                    <line stroke="#E3E9F3" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="750" y1="20" y2="20" />

                    {/* Y-Axis Ticks */}
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="end" x="32" y="163">0</text>
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="end" x="32" y="128">10</text>
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="end" x="32" y="93">20</text>
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="end" x="32" y="58">30</text>
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="end" x="32" y="23">40</text>

                    {/* Muted background daily bars */}
                    <rect fill="#e9edff" height="90" rx="3" width="12" x="70" y="70" />
                    <rect fill="#e9edff" height="105" rx="3" width="12" x="135" y="55" />
                    <rect fill="#e9edff" height="98" rx="3" width="12" x="200" y="62" />
                    <rect fill="#e9edff" height="112" rx="3" width="12" x="265" y="48" />
                    <rect fill="#e9edff" height="80" rx="3" width="12" x="330" y="80" />
                    <rect fill="#e9edff" height="118" rx="3" width="12" x="395" y="42" />
                    <rect fill="#e9edff" height="110" rx="3" width="12" x="460" y="50" />
                    <rect fill="#e9edff" height="122" rx="3" width="12" x="525" y="38" />
                    <rect fill="#e9edff" height="100" rx="3" width="12" x="590" y="60" />
                    <rect fill="#b2c5ff" height="144" rx="3" width="12" x="655" y="16" />
                    <rect fill="#0053cd" height="128" rx="3" width="12" x="715" y="32" />

                    {/* Smooth Area Gradient & Trend Line */}
                    <path
                      d="M 76,70 C 135,55 170,62 206,62 C 240,62 250,48 271,48 C 300,48 315,80 336,80 C 370,80 380,42 401,42 C 430,42 445,50 466,50 C 500,50 510,38 531,38 C 560,38 575,60 596,60 C 630,60 640,16 661,16 C 690,16 700,32 721,32 L 721,160 L 76,160 Z"
                      fill="url(#attendanceGradient)"
                    />
                    <path
                      d="M 76,70 C 135,55 170,62 206,62 C 240,62 250,48 271,48 C 300,48 315,80 336,80 C 370,80 380,42 401,42 C 430,42 445,50 466,50 C 500,50 510,38 531,38 C 560,38 575,60 596,60 C 630,60 640,16 661,16 C 690,16 700,32 721,32"
                      fill="none"
                      stroke="#0053cd"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                    />

                    {/* Peak indicator on Wed Jun 24 (46 attendees) */}
                    <circle cx="661" cy="16" fill="#0053cd" r="4.5" stroke="#ffffff" strokeWidth="2" />
                    <rect fill="#001848" height="18" rx="4" width="62" x="630" y="-8" />
                    <text fill="#ffffff" fontFamily="Inter" fontSize="9" fontWeight="700" textAnchor="middle" x="661" y="4">
                      Peak: 46
                    </text>

                    {/* Today Jun 25 indicator */}
                    <circle cx="721" cy="32" fill="#256cf3" r="5" stroke="#ffffff" strokeWidth="2" />

                    {/* X-Axis Labels */}
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="middle" x="76" y="176">Jun 03</text>
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="middle" x="206" y="176">Jun 08</text>
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="middle" x="336" y="176">Jun 13</text>
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="middle" x="466" y="176">Jun 18</text>
                    <text fill="#737786" fontFamily="Inter" fontSize="10" textAnchor="middle" x="596" y="176">Jun 23</text>
                    <text fill="#0053cd" fontFamily="Inter" fontSize="10" fontWeight="600" textAnchor="middle" x="721" y="176">Today (25)</text>
                  </svg>
                </div>
              </div>

              {/* Footnote */}
              <div className="pt-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-on-surface-variant font-body-sm text-body-sm">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-outline">
                    info
                  </span>
                  <span>
                    Attendance metrics represent unique member studio visits per calendar day (not double-counting back-to-back blocks).
                  </span>
                </div>
                <span className="font-label-sm text-label-sm font-semibold text-secondary">
                  Studio Avg: 36/day
                </span>
              </div>
            </div>
          </div>

          {/* Retention Health Overview & Attention Queue (unless hidden via state) */}
          {state !== 'no_ml' && (
            <div className="flex flex-col gap-space-lg w-full">
              {/* Retention Health Overview Strip */}
              <div className="w-full bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm mb-space-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        health_and_safety
                      </span>
                      <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        Retention Health Overview
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-medium border border-border-delicate">
                        Triage Ready
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-text-muted mt-1">
                      Retention Score is an operational prioritization score to triage member outreach,{' '}
                      <span className="font-medium text-on-surface">
                        NOT a predictive probability of churn
                      </span>.
                    </p>
                  </div>
                  <Link
                    href="/retention"
                    className="font-label-md text-label-md font-semibold text-primary hover:text-primary-container inline-flex items-center gap-1 self-start md:self-auto"
                  >
                    <span>View Full Retention Overview</span>
                    <span className="material-symbols-outlined text-[16px]">
                      chevron_right
                    </span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                  {/* Low Risk */}
                  <div className="p-space-lg rounded-xl bg-sage-tint border border-sage-border flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label-md text-label-md font-semibold text-secondary">
                        Low-Risk Members
                      </span>
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        check_circle
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                          {data.retentionSummary.lowCount}
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-secondary">
                          {data.retentionSummary.lowPercent}%
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-text-muted mt-1">
                        Steady attendance cadence ≥ 2x/wk
                      </p>
                    </div>
                  </div>

                  {/* Medium Risk */}
                  <div className="p-space-lg rounded-xl bg-surface-container-low border border-border-delicate flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label-md text-label-md font-semibold text-tertiary">
                        Medium-Risk
                      </span>
                      <span className="material-symbols-outlined text-tertiary text-[20px]">
                        change_circle
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                          {data.retentionSummary.mediumCount}
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-tertiary">
                          {data.retentionSummary.mediumPercent}%
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-text-muted mt-1">
                        Cadence drop of 30-50% in past 14d
                      </p>
                    </div>
                  </div>

                  {/* High Risk */}
                  <div className="p-space-lg rounded-xl bg-rose-tint border border-outline-variant/30 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label-md text-label-md font-semibold text-rose-text">
                        High-Risk Members
                      </span>
                      <span className="material-symbols-outlined text-rose-soft text-[20px]">
                        emergency
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-lg text-headline-lg font-bold text-rose-text">
                          {data.retentionSummary.highCount}
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-rose-soft">
                          {data.retentionSummary.highPercent}%
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-text-muted mt-1">
                        Absent &gt; 12 days; zero rebookings
                      </p>
                    </div>
                  </div>

                  {/* Limited Assessments */}
                  <div className="p-space-lg rounded-xl bg-surface-bright border border-border-delicate flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label-md text-label-md font-semibold text-text-muted">
                        Limited Assessments
                      </span>
                      <span className="material-symbols-outlined text-text-soft text-[20px]">
                        schedule
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                          {data.retentionSummary.limitedCount}
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-text-muted">
                          {data.retentionSummary.limitedPercent}%
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-text-muted mt-1">
                        New joiners &lt; 14 days baseline
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attention Queue Table */}
              <div className="w-full bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        assignment_late
                      </span>
                      <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        Member Attention Queue
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-rose-tint text-rose-text font-label-sm text-label-sm font-bold">
                        {data.attentionQueue.length} Pending Actions
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      Members prioritized by attendance drops and lifecycle thresholds for staff follow-up.
                    </p>
                  </div>
                  <Link
                    href="/retention"
                    className="font-label-md text-label-md font-semibold text-primary hover:text-primary-container inline-flex items-center gap-1 self-start sm:self-auto"
                  >
                    <span>Open Retention Triage</span>
                    <span className="material-symbols-outlined text-[16px]">
                      open_in_new
                    </span>
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-delicate text-on-surface-variant font-label-sm text-label-sm">
                        <th className="pb-3 font-semibold">Member</th>
                        <th className="pb-3 font-semibold">Status / Plan</th>
                        <th className="pb-3 font-semibold">Risk Level</th>
                        <th className="pb-3 font-semibold">Cadence Signal</th>
                        <th className="pb-3 font-semibold">Primary Recommendation</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-delicate font-body-md text-body-md">
                      {data.attentionQueue.map((item) => (
                        <tr key={item.memberId} className="hover:bg-surface-bright transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-label-sm text-on-surface">
                                {item.memberInitials}
                              </div>
                              <Link
                                href={`/members/${item.memberId}`}
                                className="font-semibold text-on-surface hover:text-primary transition-colors"
                              >
                                {item.memberName}
                              </Link>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-on-surface-variant font-label-md text-label-md">
                            {item.planName}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span
                              className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 ${
                                item.category === 'HIGH'
                                  ? 'bg-rose-tint text-rose-soft'
                                  : 'bg-surface-container-low text-tertiary'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {item.category} ({item.score})
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-text-muted font-body-sm text-body-sm">
                            {item.cadenceDrop}
                          </td>
                          <td className="py-3.5 pr-4 text-on-surface font-body-sm text-body-sm max-w-xs">
                            {item.primaryRecommendation}
                          </td>
                          <td className="py-3.5 text-right">
                            <Link
                              href={`/members/${item.memberId}`}
                              className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-label-sm text-label-sm font-semibold transition-colors"
                            >
                              Review & Contact
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
