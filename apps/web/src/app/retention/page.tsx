'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/shell/AppShell';
import type { DashboardKPIs } from '../../lib/types';
import { fetchDashboardData } from '../../lib/api';

export default function RetentionPage() {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'limited'>('all');
  const [data, setData] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchDashboardData()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load retention data', err);
        setError(err instanceof Error ? err.message : 'Failed to load retention analytics.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const queue = data?.attentionQueue ?? [];
  const summary = data?.retentionSummary ?? {
    lowCount: 0,
    lowPercent: 0,
    mediumCount: 0,
    mediumPercent: 0,
    highCount: 0,
    highPercent: 0,
    limitedCount: 0,
    limitedPercent: 0,
  };

  const filteredQueue = queue.filter((item) => {
    if (filter === 'high') return item.category === 'HIGH';
    if (filter === 'medium') return item.category === 'MEDIUM';
    if (filter === 'limited') return item.category === 'LIMITED';
    return true;
  });

  return (
    <AppShell title="Retention Intelligence">
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-space-lg">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                Retention Intelligence
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold border border-border-delicate">
                Model v1.0.0
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Deterministic operational prioritization score to triage member outreach,{' '}
              <span className="font-semibold text-on-surface">NOT a predictive churn percentage</span>.
            </p>
          </div>
        </div>

        {error && (
          <div className="w-full bg-error-container text-on-error-container p-space-lg rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px]">cloud_off</span>
              <p className="font-headline-sm text-headline-sm font-bold">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 rounded-lg bg-error text-on-error font-label-md text-label-md font-semibold hover:opacity-95 shadow-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* 4 Retention Distribution Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Low Risk */}
          <div className="p-space-lg rounded-2xl bg-sage-tint border border-sage-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-md text-label-md font-semibold text-secondary">
                Low-Risk Members
              </span>
              <span className="material-symbols-outlined text-secondary text-[22px]">
                check_circle
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {summary.lowCount}
                </span>
                <span className="font-label-md text-label-md font-semibold text-secondary">
                  {summary.lowPercent}%
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-muted mt-1">
                Healthy cadence ≥ 2x/wk; high consistency
              </p>
            </div>
          </div>

          {/* Medium Risk */}
          <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-border-delicate shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-md text-label-md font-semibold text-tertiary">
                Medium-Risk Members
              </span>
              <span className="material-symbols-outlined text-tertiary text-[22px]">
                change_circle
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {summary.mediumCount}
                </span>
                <span className="font-label-md text-label-md font-semibold text-tertiary">
                  {summary.mediumPercent}%
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-muted mt-1">
                Cadence drift 30-50% in past 14 days
              </p>
            </div>
          </div>

          {/* High Risk */}
          <div className="p-space-lg rounded-2xl bg-rose-tint border border-outline-variant/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-md text-label-md font-semibold text-rose-text">
                High-Risk Members
              </span>
              <span className="material-symbols-outlined text-rose-soft text-[22px]">
                emergency
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-bold text-rose-text">
                  {summary.highCount}
                </span>
                <span className="font-label-md text-label-md font-semibold text-rose-soft">
                  {summary.highPercent}%
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-muted mt-1">
                Absent &gt; 12 days or severe cadence collapse
              </p>
            </div>
          </div>

          {/* Limited Assessment */}
          <div className="p-space-lg rounded-2xl bg-surface-container-lowest border border-border-delicate shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-md text-label-md font-semibold text-text-muted">
                Limited Assessments
              </span>
              <span className="material-symbols-outlined text-text-soft text-[22px]">
                schedule
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {summary.limitedCount}
                </span>
                <span className="font-label-md text-label-md font-semibold text-text-muted">
                  {summary.limitedPercent}%
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-muted mt-1">
                New joiners (&lt; 14 days baseline)
              </p>
            </div>
          </div>
        </div>

        {/* Attention Queue Table */}
        <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border-delicate">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  assignment_late
                </span>
                Priority Triage & Attention Queue
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Ranked order of members requiring instructor touchpoints and studio re-engagement.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  ['all', 'All Attention'],
                  ['high', 'High Risk Only'],
                  ['medium', 'Medium Risk'],
                ] as const
              ).map(([key, label]) => {
                const active = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold transition-all ${
                      active
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-text-muted font-body-md animate-pulse">
              Computing attention queue from studio telemetries...
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="p-12 text-center text-text-muted font-body-md">
              No members currently queued for re-engagement triage.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-body-md text-body-md">
                <thead>
                  <tr className="border-b border-border-delicate text-on-surface-variant font-label-sm">
                    <th className="py-3 font-semibold">Member</th>
                    <th className="py-3 font-semibold">Plan</th>
                    <th className="py-3 font-semibold">
                      <span title="Higher scores indicate greater outreach priority; this is not a churn probability.">
                        Triage Score
                      </span>
                    </th>
                    <th className="py-3 font-semibold">Drift Signal</th>
                    <th className="py-3 font-semibold">Primary Recommendation</th>
                    <th className="py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-delicate">
                  {filteredQueue.map((item) => (
                    <tr key={item.memberId} className="hover:bg-surface-bright">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-label-md text-on-surface">
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
                      <td className="py-3.5 pr-4 text-on-surface-variant">{item.planName}</td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 ${
                            item.category === 'HIGH'
                              ? 'bg-rose-tint text-rose-soft'
                              : 'bg-surface-container text-tertiary'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {item.category} ({item.score}/100)
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-text-muted font-body-sm">{item.cadenceDrop}</td>
                      <td className="py-3.5 pr-4 text-on-surface font-body-sm max-w-sm">
                        {item.primaryRecommendation}
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/members/${item.memberId}`}
                          aria-label={`Review ${item.memberName}'s retention profile`}
                          className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary-container shadow-xs transition-all"
                        >
                          Review Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
