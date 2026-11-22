'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardKPIs } from '../../lib/types';
import { fetchDashboardData } from '../../lib/api';
import { useAppSession } from '../shell/AppSession';

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

export function DashboardOverview({ initialData }: DashboardOverviewProps) {
  const [state, setState] = useState<'active' | 'loading' | 'error'>(
    initialData ? 'active' : 'loading',
  );
  const [trendMode, setTrendMode] = useState<'daily' | 'monthly'>('daily');
  const [data, setData] = useState<DashboardKPIs>(
    initialData ?? EMPTY_DASHBOARD_KPIS,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const session = useAppSession();

  const loadData = (trendInterval: 'daily' | 'monthly' = trendMode) => {
    setState('loading');
    setErrorMessage(null);
    fetchDashboardData({ trendInterval })
      .then((result) => {
        setData(result);
        setState('active');
      })
      .catch((err) => {
        console.error('Failed to load dashboard data', err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Studio telemetries could not synchronize with the cloud database.',
        );
        setState('error');
      });
  };

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setState('active');
    } else {
      loadData('daily');
    }
  }, [initialData]);

  const asOfDate = data.asOfDate ?? new Date().toISOString().slice(0, 10);
  const displayDate = new Date(`${asOfDate}T12:00:00`).toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: data.studioTimezone || 'UTC',
    },
  );
  const averageAttendance = data.attendanceTrends.length
    ? Math.round(
        data.attendanceTrends.reduce((total, item) => total + item.count, 0) /
          data.attendanceTrends.length,
      )
    : 0;
  const maxAttendance = Math.max(
    0,
    ...data.attendanceTrends.map((item) => item.count),
  );
  const chartCeiling = Math.max(4, Math.ceil(maxAttendance / 4) * 4);
  const chartPoints = data.attendanceTrends.map((item, index) => {
    const x =
      data.attendanceTrends.length <= 1
        ? 380
        : 55 + (index * 650) / (data.attendanceTrends.length - 1);
    return {
      ...item,
      x,
    };
  });

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto">
      {/* Error View Banner */}
      {state === 'error' && (
        <div className="w-full bg-error-container text-on-error-container p-space-lg rounded-xl mb-space-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px]">
              cloud_off
            </span>
            <div>
              <p className="font-headline-sm text-headline-sm font-bold">
                Failed to load studio analytics
              </p>
              <p className="font-body-md text-body-md opacity-90">
                {errorMessage ||
                  'Studio telemetries could not synchronize with the cloud database. Please retry or check connection.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
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
              <span>{session.studio.name}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-sage-tint border border-sage-border text-secondary font-label-sm text-label-sm font-medium">
              Your studio workspace
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
            <span className="font-medium text-on-surface">{displayDate}</span>
            <span className="text-on-surface-variant">• Today</span>
          </div>
          <Link
            href="/studio/attendance"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-xs border border-border-delicate"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">
              event_available
            </span>
            <span>Record Attendance</span>
          </Link>
          <Link
            href="/studio/members/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">
              person_add
            </span>
            <span>+ Add Member</span>
          </Link>
        </div>
      </div>

      {/* SKELETON LOADING VIEW */}
      {state === 'loading' && (
        <div className="flex flex-col gap-space-lg w-full animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-28 bg-surface-container-high rounded-xl"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            <div className="lg:col-span-4 h-72 bg-surface-container-high rounded-xl" />
            <div className="lg:col-span-8 h-72 bg-surface-container-high rounded-xl" />
          </div>
          <div className="h-80 bg-surface-container-high rounded-xl" />
        </div>
      )}

      {/* Empty studio onboarding */}
      {state === 'active' && data.totalMembers === 0 && (
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
            Your studio workspace is clean and ready. Start by adding your first
            studio member or logging class visits to unlock live retention
            triage and attendance analytics.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-space-sm">
            <Link
              href="/studio/members/new"
              className="flex items-center gap-1.5 px-space-md py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>
              <span>Add Your First Member</span>
            </Link>
            <Link
              href="/studio/attendance"
              className="px-space-md py-2.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors"
            >
              Open Attendance
            </Link>
          </div>
        </div>
      )}

      {/* Live studio data */}
      {state === 'active' && (
        <div className="flex flex-col gap-space-lg w-full">
          {/* Top 5 KPI Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-space-md">
            {/* 1. Active Members */}
            <Link
              href="/studio/members"
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-text-muted font-medium">
                  Active Members
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">
                    group
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-metric-lg text-metric-lg font-bold text-on-surface">
                    {data.activeMembers}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-muted">
                    members
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted truncate mt-1">
                  Out of {data.totalMembers} total registered
                </p>
              </div>
            </Link>

            {/* 2. New Registrations */}
            <Link
              href="/studio/members?filter=new"
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-text-muted font-medium">
                  New Registrations
                </span>
                <div className="w-8 h-8 rounded-lg bg-sage-tint flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">
                    person_add
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-metric-lg text-metric-lg font-bold text-on-surface">
                    {data.newRegistrations}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-sage-tint text-secondary font-label-sm text-label-sm font-semibold">
                    new
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted truncate mt-1">
                  In the last 30 days
                </p>
              </div>
            </Link>

            {/* 3. Attendance Today */}
            <Link
              href="/studio/attendance"
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-text-muted font-medium">
                  Attendance Today
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">
                    event_seat
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-metric-lg text-metric-lg font-bold text-on-surface">
                    {data.attendanceToday}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-muted">
                    unique members
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted truncate mt-1">
                  Unique member visits today
                </p>
              </div>
            </Link>

            {/* 4. High-Risk Members */}
            <Link
              href="/studio/retention"
              className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-delicate shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-text-muted font-medium">
                  High-Risk Members
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-tint flex items-center justify-center text-rose-soft group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">
                    warning
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-metric-lg text-metric-lg font-bold text-rose-soft">
                    {data.highRiskCount}
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
              href="/studio/members?filter=expiring"
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
                    {data.expiringIn7Days}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-muted">
                    renewals
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted truncate mt-1">
                  Due within the next 7 days
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
                    style={{
                      width: `${data.membershipBreakdown.activePercent}%`,
                    }}
                    title={`Active: ${data.membershipBreakdown.activePercent}%`}
                  />
                  <div
                    className="h-full bg-outline-variant"
                    style={{
                      width: `${data.membershipBreakdown.pausedPercent}%`,
                    }}
                    title={`Paused: ${data.membershipBreakdown.pausedPercent}%`}
                  />
                  <div
                    className="h-full bg-tertiary-container"
                    style={{
                      width: `${data.membershipBreakdown.expiringPercent}%`,
                    }}
                    title={`Expiring: ${data.membershipBreakdown.expiringPercent}%`}
                  />
                  <div
                    className="h-full bg-error"
                    style={{
                      width: `${data.membershipBreakdown.expiredPercent}%`,
                    }}
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
                  href="/studio/members"
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
                      Unique member studio check-ins across operating calendar
                      days.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Daily / Monthly toggle */}
                    <div className="flex bg-surface-container p-0.5 rounded-lg text-on-surface-variant font-label-sm text-label-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setTrendMode('daily');
                          loadData('daily');
                        }}
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
                        onClick={() => {
                          setTrendMode('monthly');
                          loadData('monthly');
                        }}
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
                      {trendMode === 'daily'
                        ? 'Last 14 days'
                        : 'Last 12 months'}
                    </span>
                  </div>
                </div>

                {/* Data-driven attendance chart */}
                <div className="relative h-56 w-full pt-4 pb-2">
                  {chartPoints.every((point) => point.count === 0) ? (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border-delicate bg-surface-bright px-6 text-center">
                      <div>
                        <span className="material-symbols-outlined text-3xl text-outline">
                          show_chart
                        </span>
                        <p className="mt-2 font-label-md text-label-md font-semibold text-on-surface">
                          No attendance recorded in this period
                        </p>
                        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                          Check-ins will appear here as your studio records
                          visits.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <svg
                      aria-label={`${trendMode === 'daily' ? 'Daily' : 'Monthly'} attendance trend`}
                      className="h-full w-full"
                      preserveAspectRatio="xMidYMid meet"
                      role="img"
                      viewBox="0 0 760 180"
                    >
                      {[0, 1, 2, 3, 4].map((step) => {
                        const y = 160 - step * 35;
                        const tickValue = Math.round((chartCeiling * step) / 4);
                        return (
                          <g key={step}>
                            <line
                              stroke="#E3E9F3"
                              strokeDasharray={step === 0 ? undefined : '3 3'}
                              strokeWidth="1"
                              x1="48"
                              x2="748"
                              y1={y}
                              y2={y}
                            />
                            <text
                              fill="#737786"
                              fontFamily="Inter"
                              fontSize="10"
                              textAnchor="end"
                              x="32"
                              y={y + 3}
                            >
                              {tickValue}
                            </text>
                          </g>
                        );
                      })}
                      {chartPoints.map((point) => {
                        const height = (point.count / chartCeiling) * 132;
                        const spacing =
                          chartPoints.length > 1
                            ? 650 / (chartPoints.length - 1)
                            : 650;
                        const barWidth = Math.min(32, spacing * 0.56);
                        return (
                          <rect
                            key={point.date}
                            fill="#86aaf5"
                            height={height}
                            rx="5"
                            width={barWidth}
                            x={point.x - barWidth / 2}
                            y={160 - height}
                          >
                            <title>{`${point.label}: ${point.count} visits`}</title>
                          </rect>
                        );
                      })}
                      {chartPoints.map((point, index) => {
                        const labelStep = Math.max(
                          1,
                          Math.ceil(chartPoints.length / 5),
                        );
                        if (
                          index % labelStep !== 0 &&
                          index !== chartPoints.length - 1
                        )
                          return null;
                        return (
                          <text
                            key={point.date}
                            fill="#737786"
                            fontFamily="Inter"
                            fontSize="10"
                            textAnchor="middle"
                            x={point.x}
                            y="176"
                          >
                            {point.label}
                          </text>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>

              {/* Footnote */}
              <div className="pt-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-on-surface-variant font-body-sm text-body-sm">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-outline">
                    info
                  </span>
                  <span>
                    {trendMode === 'daily'
                      ? 'Daily totals count unique member visits for each studio-local calendar date.'
                      : 'Monthly totals count member attendance days within each studio-local month.'}
                  </span>
                </div>
                <span className="font-label-sm text-label-sm font-semibold text-secondary">
                  Average: {averageAttendance}{' '}
                  {trendMode === 'daily' ? 'visits/day' : 'visits/month'}
                </span>
              </div>
            </div>
          </div>

          {/* Retention Health Overview & Attention Queue (unless hidden via state) */}
          {
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
                      Retention Score is an operational prioritization score to
                      triage member outreach,{' '}
                      <span className="font-medium text-on-surface">
                        NOT a predictive probability of churn
                      </span>
                      .
                    </p>
                  </div>
                  <Link
                    href="/studio/retention"
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
                      Members prioritized by attendance drops and lifecycle
                      thresholds for staff follow-up.
                    </p>
                  </div>
                  <Link
                    href="/studio/retention"
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
                        <th className="pb-3 font-semibold">
                          Primary Recommendation
                        </th>
                        <th className="w-24 whitespace-nowrap pb-3 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-delicate font-body-md text-body-md">
                      {data.attentionQueue.map((item) => (
                        <tr
                          key={item.memberId}
                          className="hover:bg-surface-bright transition-colors"
                        >
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-label-sm text-on-surface">
                                {item.memberInitials}
                              </div>
                              <Link
                                href={`/studio/members/${item.memberId}`}
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
                          <td className="w-24 whitespace-nowrap py-3.5 text-right">
                            <Link
                              href={`/studio/members/${item.memberId}`}
                              aria-label={`Review ${item.memberName}'s profile`}
                              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-surface-container-low px-2.5 py-2 text-primary font-label-sm text-label-sm font-semibold transition-colors hover:bg-surface-container"
                            >
                              <span>Review</span>
                              <span className="material-symbols-outlined text-[15px]">
                                arrow_forward
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          }
        </div>
      )}
    </div>
  );
}
