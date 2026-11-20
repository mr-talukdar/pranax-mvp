'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/shell/AppShell';
import type { MemberSummary } from '../../lib/types';
import { fetchDashboardData, fetchMembers } from '../../lib/api';

type StudioMemberCounts = {
  active: number;
  paused: number;
  expired: number;
  highRisk: number;
};

function formatLastVisit(lastVisit: string | null): string {
  if (!lastVisit) return 'Never';
  const date = new Date(lastVisit);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [studioCounts, setStudioCounts] = useState<StudioMemberCounts | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'expiring' | 'high_risk' | 'new'>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadMembers = useCallback(() => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    fetchMembers({
      search: debouncedSearch,
      directoryFilter: filter,
      limit: pageSize,
      offset: page * pageSize,
    })
      .then((data) => {
        if (currentRequestId !== requestId.current) return;
        setMembers(data.members);
        setResultsTotal(data.total);
        setHasMore(data.hasMore);
        if (page === 0 && filter === 'all' && !debouncedSearch) {
          setMemberTotal(data.total);
        }
      })
      .catch((err) => {
        if (currentRequestId !== requestId.current) return;
        console.error('Failed to load members', err);
        setError(err instanceof Error ? err.message : 'Failed to load members directory.');
      })
      .finally(() => {
        if (currentRequestId === requestId.current) setLoading(false);
      });
  }, [debouncedSearch, filter, page, pageSize]);

  useEffect(() => {
    loadMembers();
    return () => {
      requestId.current += 1;
    };
  }, [loadMembers]);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => globalThis.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let isCurrent = true;
    fetchDashboardData()
      .then((dashboard) => {
        if (!isCurrent) return;
        setMemberTotal(dashboard.totalMembers);
        setStudioCounts({
          active: dashboard.activeMembers,
          paused: dashboard.membershipBreakdown.paused,
          expired: dashboard.membershipBreakdown.expired,
          highRisk: dashboard.retentionSummary.highCount,
        });
      })
      .catch((dashboardError) => {
        console.error('Failed to load studio member counts', dashboardError);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const stats = {
    total: memberTotal,
    active: studioCounts?.active ?? 0,
    paused: studioCounts?.paused ?? 0,
    expired: studioCounts?.expired ?? 0,
    highRisk: studioCounts?.highRisk ?? 0,
  };

  const allCurrentPageSelected =
    members.length > 0 && members.every((member) => selectedIds.includes(member.id));
  const totalPages = Math.max(1, Math.ceil(resultsTotal / pageSize));
  const rangeStart = resultsTotal === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize + members.length, resultsTotal);

  const toggleSelectAll = () => {
    const currentPageIds = new Set(members.map((member) => member.id));
    if (allCurrentPageSelected) {
      setSelectedIds((previous) => previous.filter((id) => !currentPageIds.has(id)));
    } else {
      setSelectedIds((previous) => [
        ...new Set([...previous, ...currentPageIds]),
      ]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <AppShell title="Members Directory">
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-space-lg">
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                Members
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
                {stats.total} Total
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Complete registry of pilates & fitness members, status, and retention indicators.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/attendance/import"
              className="px-3.5 py-2 rounded-xl border border-border-delicate bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Import CSV</span>
            </Link>
            <Link
              href="/members/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Add Member</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-border-delicate shadow-xs">
            <span className="font-label-sm text-label-sm text-text-muted">Total Roster</span>
            <p className="font-metric-md text-metric-md font-bold text-on-surface mt-1">{stats.total}</p>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-border-delicate shadow-xs">
            <span className="font-label-sm text-label-sm text-secondary font-medium">Active Pass</span>
            <p className="font-metric-md text-metric-md font-bold text-secondary mt-1">{stats.active}</p>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-border-delicate shadow-xs">
            <span className="font-label-sm text-label-sm text-text-muted">Paused Pass</span>
            <p className="font-metric-md text-metric-md font-bold text-on-surface mt-1">{stats.paused}</p>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-border-delicate shadow-xs">
            <span className="font-label-sm text-label-sm text-rose-soft font-medium">High Risk</span>
            <p className="font-metric-md text-metric-md font-bold text-rose-soft mt-1">{stats.highRisk}</p>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-lowest border border-border-delicate shadow-xs">
            <span className="font-label-sm text-label-sm text-text-muted">Expired</span>
            <p className="font-metric-md text-metric-md font-bold text-text-muted mt-1">{stats.expired}</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-border-delicate shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined text-outline absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-outline"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                ['all', 'All'],
                ['active', 'Active'],
                ['paused', 'Paused'],
                ['high_risk', 'High Risk'],
                ['new', 'New Joiners'],
              ] as const
            ).map(([key, label]) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                    title={key === 'new' ? 'Joined in the last 14 days' : undefined}
                  onClick={() => {
                    setFilter(key);
                    setPage(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all ${
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

        {/* Members Directory Table */}
        <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate shadow-xs overflow-hidden">
          {error ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[36px] text-error">error</span>
              <p className="font-headline-sm font-semibold text-error">{error}</p>
              <button
                type="button"
                onClick={loadMembers}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md font-semibold hover:bg-primary-container"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-text-muted font-body-md animate-pulse">
              Loading members directory...
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-outline mb-2">
                person_search
              </span>
              <p className="font-headline-sm font-semibold text-on-surface">No members found</p>
              <p className="font-body-md text-text-muted mt-1">
                Try adjusting your search criteria or filter options.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-delicate bg-surface-bright text-on-surface-variant font-label-sm text-label-sm">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={allCurrentPageSelected}
                        onChange={toggleSelectAll}
                        className="rounded text-primary focus:ring-primary cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold">Member</th>
                    <th className="py-3 px-4 font-semibold">Plan & Status</th>
                    <th className="py-3 px-4 font-semibold">Weekly Cadence</th>
                    <th className="py-3 px-4 font-semibold">Retention Risk</th>
                    <th className="py-3 px-4 font-semibold">Last Visit</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-delicate font-body-md text-body-md">
                  {members.map((member) => {
                    const isSelected = selectedIds.includes(member.id);
                    return (
                      <tr
                        key={member.id}
                        className={`hover:bg-surface-bright transition-colors ${
                          isSelected ? 'bg-primary-fixed/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(member.id)}
                            className="rounded text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full ${
                                member.avatarBg ?? 'bg-primary'
                              } flex items-center justify-center font-bold text-label-md text-on-primary shadow-xs`}
                            >
                              {member.firstName[0]}
                              {member.lastName[0]}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <Link
                                href={`/members/${member.id}`}
                                className="font-semibold text-on-surface hover:text-primary transition-colors truncate"
                              >
                                {member.firstName} {member.lastName}
                              </Link>
                              <span className="font-body-sm text-body-sm text-text-muted truncate">
                                {member.email ?? member.phone ?? 'No contact info'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-on-surface">{member.planName}</span>
                            <div>
                              <span
                                className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold inline-block ${
                                  member.status === 'ACTIVE'
                                    ? 'bg-sage-tint text-secondary'
                                    : member.status === 'PAUSED'
                                    ? 'bg-surface-container text-on-surface-variant'
                                    : 'bg-rose-tint text-rose-soft'
                                }`}
                              >
                                {member.status}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-on-surface font-body-sm">
                          {member.cadence}
                        </td>
                        <td className="py-3.5 px-4">
                          {member.retentionCategory ? (
                            <span
                              className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 ${
                                member.retentionCategory === 'LOW'
                                  ? 'bg-sage-tint text-secondary'
                                  : member.retentionCategory === 'MEDIUM'
                                  ? 'bg-surface-container text-tertiary'
                                  : member.retentionCategory === 'HIGH'
                                  ? 'bg-rose-tint text-rose-soft'
                                  : 'bg-surface-container text-text-muted'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {member.retentionCategory}
                              {member.retentionScore !== null ? ` (${member.retentionScore}/100)` : ''}
                            </span>
                          ) : (
                            <span className="text-text-muted font-body-sm">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-on-surface-variant font-body-sm">
                          {formatLastVisit(member.lastVisit)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/members/${member.id}`}
                            aria-label={`View ${member.firstName} ${member.lastName}'s profile`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-semibold transition-colors"
                          >
                            <span>Profile</span>
                            <span className="material-symbols-outlined text-[16px]">
                              chevron_right
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!error && !loading && (
            <div className="flex flex-col gap-3 border-t border-border-delicate px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-body-sm text-body-sm text-text-muted">
                Showing {rangeStart}–{rangeEnd} of {resultsTotal} members
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                  Rows per page
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(0);
                    }}
                    className="rounded-lg border border-border-delicate bg-surface-container-lowest px-2 py-1.5 text-on-surface focus:border-primary focus:outline-none"
                  >
                    {[25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="px-2 font-body-sm text-body-sm text-on-surface-variant">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                  className="rounded-lg border border-border-delicate px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!hasMore}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-border-delicate px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
