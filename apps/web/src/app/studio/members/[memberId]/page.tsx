'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../../components/shell/AppShell';
import type { AttendanceItem, MemberDetail } from '../../../../lib/types';
import {
  fetchMemberById,
  fetchAttendanceRecords,
  pauseMembershipApi,
  resumeMembershipApi,
  renewMembershipApi,
  cancelMembershipApi,
} from '../../../../lib/api';

interface MemberPageProps {
  params: Promise<{ memberId: string }>;
}

export default function MemberDetailPage({ params }: MemberPageProps) {
  const resolvedParams = use(params);
  const memberId = resolvedParams.memberId;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [attendanceVisits, setAttendanceVisits] = useState<AttendanceItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'membership' | 'attendance' | 'retention'>('overview');
  const [activeModal, setActiveModal] = useState<'pause' | 'renew' | 'cancel' | 'resume' | null>(null);
  const [pauseReason, setPauseReason] = useState('Medical recovery');
  const [pauseWeeks, setPauseWeeks] = useState('4');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const retention = member?.retentionAssessment ?? null;

  const loadMemberData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMemberById(memberId);
      setMember(data);
      const att = await fetchAttendanceRecords({ memberId });
      setAttendanceVisits(att.records);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load member profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  if (loading) {
    return (
      <AppShell title="Member Profile">
        <div className="flex flex-col items-center justify-center p-16 animate-pulse text-text-muted">
          Loading member profile...
        </div>
      </AppShell>
    );
  }

  if (loadError || !member) {
    return (
      <AppShell title="Member Not Found">
        <div className="flex flex-col items-center justify-center p-16 gap-4 text-center">
          <span className="material-symbols-outlined text-[48px] text-error">error</span>
          <p className="font-headline-sm font-semibold text-error">
            {loadError || 'Member profile could not be found.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadMemberData}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md font-semibold"
            >
              Retry
            </button>
            <Link
              href="/studio/members"
              className="px-4 py-2 rounded-xl border border-border-delicate hover:bg-surface-container font-label-md"
            >
              Back to Members
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const handlePause = async () => {
    if (!member) return;
    setSubmittingAction(true);
    setActionError(null);
    try {
      const periodId = member.membership.planId;
      const now = new Date();
      const resumesAt = new Date(now.getTime() + Number(pauseWeeks) * 7 * 86_400_000).toISOString();
      await pauseMembershipApi(member.id, periodId, {
        startsAt: now.toISOString(),
        resumesAt,
      });
      setActionSuccess(`Membership paused for ${pauseWeeks} weeks.`);
      setActiveModal(null);
      await loadMemberData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to pause membership.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResume = async () => {
    if (!member) return;
    setSubmittingAction(true);
    setActionError(null);
    try {
      const periodId = member.membership.planId;
      await resumeMembershipApi(member.id, periodId);
      setActionSuccess('Membership resumed successfully.');
      setActiveModal(null);
      await loadMemberData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to resume membership.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRenew = async () => {
    if (!member) return;
    setSubmittingAction(true);
    setActionError(null);
    try {
      const periodId = member.membership.planId;
      await renewMembershipApi(member.id, periodId, {});
      setActionSuccess('Membership renewed successfully.');
      setActiveModal(null);
      await loadMemberData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to renew membership.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancel = async () => {
    if (!member) return;
    setSubmittingAction(true);
    setActionError(null);
    try {
      const periodId = member.membership.planId;
      await cancelMembershipApi(member.id, periodId, { reason: 'Member requested cancellation' });
      setActionSuccess('Membership cancelled successfully.');
      setActiveModal(null);
      await loadMemberData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel membership.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <AppShell title={`${member.firstName} ${member.lastName}`}>
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-space-lg">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
          <Link href="/studio/members" className="hover:text-on-surface transition-colors">
            Members
          </Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">
            {member.firstName} {member.lastName}
          </span>
        </div>

        {/* Action Feedback Alerts */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-sage-tint border border-sage-border text-secondary font-label-md text-label-md font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>{actionSuccess}</span>
            </div>
            <button type="button" onClick={() => setActionSuccess(null)}>
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}
        {actionError && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container font-label-md text-label-md font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{actionError}</span>
            </div>
            <button type="button" onClick={() => setActionError(null)}>
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Member Profile Header Banner */}
        <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 sm:p-8 relative overflow-hidden shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-5">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${
                  member.avatarBg ?? 'bg-primary'
                } flex items-center justify-center flex-shrink-0 text-on-primary font-headline-lg text-headline-lg font-bold shadow-md`}
              >
                {member.firstName[0]}
                {member.lastName[0]}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                    {member.firstName} {member.lastName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                    #PX-{member.id.slice(-4).toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold ${
                      member.status === 'ACTIVE'
                        ? 'bg-sage-tint text-secondary'
                        : member.status === 'PAUSED'
                        ? 'bg-surface-container text-on-surface-variant'
                        : 'bg-rose-tint text-rose-soft'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {member.status} Member
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-on-surface-variant font-body-md text-body-md">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-outline">
                      location_on
                    </span>
                    ARS Pilates & Fitness • Salt Lake
                  </span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant" />
                  <span>
                    Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </span>
                </div>

                {/* Contact Links */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-on-surface-variant font-label-md text-label-md">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="px-2.5 py-1 rounded-lg bg-surface-bright border border-border-delicate hover:bg-surface-container transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">mail</span>
                      <span>{member.email}</span>
                    </a>
                  )}
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="px-2.5 py-1 rounded-lg bg-surface-bright border border-border-delicate hover:bg-surface-container transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">call</span>
                      <span>{member.phone}</span>
                    </a>
                  )}
                  {member.retentionCategory && (
                    <span
                      className={`px-2.5 py-1 rounded-lg font-label-sm text-label-sm font-semibold flex items-center gap-1 ${
                        member.retentionCategory === 'LOW'
                          ? 'bg-sage-tint text-secondary'
                          : member.retentionCategory === 'MEDIUM'
                          ? 'bg-surface-container text-tertiary'
                          : 'bg-rose-tint text-rose-soft'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        health_and_safety
                      </span>
                      <span>Retention: {member.retentionCategory} Risk</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
              {member.status === 'PAUSED' ? (
                <button
                  type="button"
                  onClick={() => setActiveModal('resume')}
                  className="px-3.5 py-2 rounded-xl border border-border-delicate bg-surface-bright hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    play_circle
                  </span>
                  <span>Resume Pass</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveModal('pause')}
                  className="px-3.5 py-2 rounded-xl border border-border-delicate bg-surface-bright hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px] text-tertiary">
                    pause_circle
                  </span>
                  <span>Pause Pass</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveModal('renew')}
                className="px-3.5 py-2 rounded-xl border border-border-delicate bg-surface-bright hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  autorenew
                </span>
                <span>Renew</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('cancel')}
                className="px-3.5 py-2 rounded-xl border border-border-delicate bg-surface-bright hover:bg-surface-container text-on-surface-variant hover:text-error font-label-md text-label-md font-medium transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">
                  cancel
                </span>
                <span>Cancel</span>
              </button>
              <Link
                href="/studio/attendance"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">event_available</span>
                <span>Check In</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex border-b border-border-delicate bg-surface-container-lowest px-4 rounded-xl shadow-xs">
          {(
            [
              ['overview', 'Overview', 'info'],
              ['membership', 'Membership', 'card_membership'],
              ['attendance', 'Attendance', 'calendar_today'],
              ['retention', 'Retention Intelligence', 'ecg_heart'],
            ] as const
          ).map(([key, label, icon]) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`py-3.5 px-4 border-b-2 font-label-md text-label-md font-semibold flex items-center gap-2 transition-all ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Left 8 cols */}
            <div className="lg:col-span-8 flex flex-col gap-space-lg">
              {/* Current Active Plan Card */}
              <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-delicate">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      card_membership
                    </span>
                    <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                      Current Active Membership
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-sage-tint text-secondary font-label-sm text-label-sm font-semibold">
                    {member.membership.status}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                      {member.membership.planName}
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                      Billing cycle: ₹{(member.membership.priceCents / 100).toLocaleString('en-IN')} / cycle
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-on-surface-variant font-label-sm text-label-sm">
                      <span>Valid: {member.membership.startsAt} to {member.membership.endsAt}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-bright border border-border-delicate text-right sm:text-center">
                    <span className="font-label-sm text-label-sm text-text-muted block">Renewal Status</span>
                    <span className="font-headline-sm text-headline-sm font-bold text-primary block mt-0.5">
                      {member.membership.renewalDueDays !== undefined && member.membership.renewalDueDays >= 0
                        ? `${member.membership.renewalDueDays} Days Left`
                        : 'Expired'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Movement & Health Notes */}
              <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-secondary text-[22px]">
                    health_and_safety
                  </span>
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    Physical & Movement Health Notes
                  </h2>
                </div>
                <p className="font-body-md text-body-md text-on-surface bg-surface-bright p-4 rounded-xl border border-border-delicate">
                  {member.notes ?? 'No specific injuries or spinal modifications noted. Regular class participant.'}
                </p>
              </div>
            </div>

            {/* Right 4 cols: Attendance & Retention Preview */}
            <div className="lg:col-span-4 flex flex-col gap-space-lg">
              {/* Attendance Snapshot Card */}
              <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 shadow-xs">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-4">
                  Attendance Snapshot
                </h3>
                <div className="flex flex-col gap-3 font-label-md text-label-md">
                  <div className="flex justify-between p-3 rounded-xl bg-surface-bright border border-border-delicate">
                    <span className="text-on-surface-variant">Cadence</span>
                    <span className="font-semibold text-on-surface">{member.cadence}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-surface-bright border border-border-delicate">
                    <span className="text-on-surface-variant">Last Visit</span>
                    <span className="font-semibold text-primary">{member.lastVisit ?? 'None logged'}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-surface-bright border border-border-delicate">
                    <span className="text-on-surface-variant">Total Recorded Sessions</span>
                    <span className="font-semibold text-on-surface">24 sessions</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              {member.emergencyContact && (
                <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 shadow-xs">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-error text-[20px]">
                      emergency
                    </span>
                    Emergency Contact
                  </h3>
                  <div className="font-body-md text-body-md text-on-surface">
                    <p className="font-semibold">{member.emergencyContact.name}</p>
                    <p className="text-on-surface-variant text-body-sm">{member.emergencyContact.relationship}</p>
                    <p className="font-mono text-body-sm mt-1">{member.emergencyContact.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MEMBERSHIP */}
        {activeTab === 'membership' && (
          <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-border-delicate">
              <div>
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Membership Period & Lifecycle
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Current plan details, duration, pricing, and historical pauses.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {member.status === 'PAUSED' ? (
                  <button
                    type="button"
                    onClick={() => setActiveModal('resume')}
                    className="px-3.5 py-2 rounded-xl border border-border-delicate bg-surface-bright hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveModal('pause')}
                    className="px-3.5 py-2 rounded-xl border border-border-delicate bg-surface-bright hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium"
                  >
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveModal('renew')}
                  className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container"
                >
                  Renew
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('cancel')}
                  className="px-3 py-2 rounded-xl border border-border-delicate bg-surface-bright hover:bg-surface-container text-on-surface-variant hover:text-error font-label-md text-label-md font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-surface-bright border border-border-delicate">
                <span className="font-label-sm text-label-sm text-text-muted">Plan Name</span>
                <p className="font-headline-sm font-bold text-on-surface mt-1">{member.membership.planName}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-bright border border-border-delicate">
                <span className="font-label-sm text-label-sm text-text-muted">Duration Period</span>
                <p className="font-headline-sm font-bold text-on-surface mt-1">
                  {member.membership.startsAt} to {member.membership.endsAt}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface-bright border border-border-delicate">
                <span className="font-label-sm text-label-sm text-text-muted">Price Paid</span>
                <p className="font-headline-sm font-bold text-on-surface mt-1">
                  ₹{(member.membership.priceCents / 100).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Pause History */}
            <div className="mt-4">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-3">
                Pause History
              </h3>
              {member.membership.pauseHistory && member.membership.pauseHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-body-md">
                    <thead>
                      <tr className="border-b border-border-delicate text-on-surface-variant font-label-sm">
                        <th className="py-2.5">Start Date</th>
                        <th className="py-2.5">End Date</th>
                        <th className="py-2.5">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-delicate">
                      {member.membership.pauseHistory.map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-3">{p.startDate}</td>
                          <td className="py-3">{p.endDate ?? 'Indefinite'}</td>
                          <td className="py-3 text-text-muted">{p.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-body-md text-text-muted italic">No pauses on record for this membership.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-border-delicate">
              <div>
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Attendance History
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Detailed check-in records for {member.firstName} across reformer and mat sessions.
                </p>
              </div>
              <Link
                href="/studio/attendance"
                className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container"
              >
                + Check In Today
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-body-md text-body-md">
                <thead>
                  <tr className="border-b border-border-delicate text-on-surface-variant font-label-sm">
                    <th className="py-3 font-semibold">Date & Time</th>
                    <th className="py-3 font-semibold">Class / Session</th>
                    <th className="py-3 font-semibold">Instructor</th>
                    <th className="py-3 font-semibold">Source</th>
                    <th className="py-3 font-semibold">Terminal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-delicate">
                  {attendanceVisits.length > 0 ? (
                    attendanceVisits.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-bright">
                        <td className="py-3.5">
                          {new Date(item.checkedInAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3.5 font-medium text-on-surface">{item.classType}</td>
                        <td className="py-3.5 text-on-surface-variant">{item.instructor}</td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container font-medium">
                            {item.source}
                          </span>
                        </td>
                        <td className="py-3.5 text-text-muted text-body-sm">{item.terminal}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">
                        No recent check-ins found for this member.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: RETENTION INTELLIGENCE (MEM-03-retention) */}
        {activeTab === 'retention' && (
          <div className="flex flex-col gap-space-lg w-full">
            {/* Top Diagnostic Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              {/* Score Card (5 cols) */}
              <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-muted font-semibold">
                      Prioritization Score
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-sage-tint text-secondary font-label-sm text-label-sm font-semibold">
                      {retention?.scoring_version ?? 'No assessment'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 my-2">
                    <span className="font-display text-display font-bold text-on-surface">
                      {retention?.score ?? '—'}
                    </span>
                    <span className="text-on-surface-variant font-headline-sm">/ 100</span>
                    <span
                      className={`ml-2 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold ${
                        retention?.category === 'HIGH'
                          ? 'bg-rose-tint text-rose-soft'
                          : retention?.category === 'MEDIUM'
                          ? 'bg-surface-container text-tertiary'
                          : retention?.category === 'LOW'
                            ? 'bg-sage-tint text-secondary'
                            : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {retention?.category ? `${retention.category} RISK` : retention?.status ?? 'NOT ASSESSED'}
                    </span>
                  </div>

                  <p className="font-body-md text-body-md text-on-surface-variant mt-3">
                    {retention?.status === 'COMPLETE'
                      ? `Score uses verified records through ${retention.assessment_date} · ${retention.scoring_version}`
                      : retention?.completeness_reasons.join(' ') || 'No retention assessment is available for this member yet.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border-delicate flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                  <span>Assessment date: {retention?.assessment_date ?? '—'}</span>
                  <span className="text-secondary font-semibold">{retention?.lifecycle_state ?? 'Unavailable'}</span>
                </div>
              </div>

              {/* Recommendation Card (7 cols) */}
              <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      psychology
                    </span>
                    <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                      Primary Recommendation
                    </h2>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-bright border border-border-delicate mb-4">
                    <p className="font-headline-sm font-semibold text-on-surface">
                      {retention?.recommendation.title ?? 'Recommendation unavailable'}
                    </p>
                    {retention?.recommendation.explanation && <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{retention.recommendation.explanation}</p>}
                  </div>

                  <h3 className="font-label-md text-label-md font-semibold text-on-surface mb-2">
                    Key Contributing Indicators
                  </h3>
                  <ul className="flex flex-col gap-2 font-body-md text-body-md text-on-surface-variant">
                    {retention?.recommendation.evidence.length ? retention.recommendation.evidence.map((indicator) => (
                      <li className="flex items-start gap-2" key={indicator.code}>
                        <span className="material-symbols-outlined text-[16px] text-secondary">{indicator.available ? 'check' : 'info'}</span>
                        <span><strong>{indicator.label}:</strong> {indicator.explanation}</span>
                      </li>
                    )) : <li>Assessment evidence is not available.</li>}
                  </ul>
                </div>

                {retention?.recommendation.action && (
                  <p className="mt-4 text-right font-label-md text-label-md text-on-surface-variant">
                    Suggested action: {retention.recommendation.action}
                  </p>
                )}
              </div>
            </div>

            {/* 4 Dimension Scores Breakdown */}
            <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs">
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-4">
                Retention Dimensions Breakdown
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {retention ? Object.entries(retention.dimensions).map(([name, dimension]) => (
                  <div className="p-4 rounded-xl bg-surface-bright border border-border-delicate" key={name}>
                    <span className="font-label-sm text-label-sm text-text-muted">{name.replaceAll('_', ' ')}</span>
                    <p className="font-headline-lg font-bold text-on-surface mt-1">{dimension.score === null ? '—' : `${dimension.score} / 100`}</p>
                    <p className="font-body-sm text-body-sm text-text-muted mt-1">{dimension.explanation}</p>
                  </div>
                )) : <p className="text-on-surface-variant">Dimension scores are unavailable until an assessment is completed.</p>}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PAUSE MEMBERSHIP */}
        {activeModal === 'pause' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs">
            <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-delicate flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-delicate">
                <h3 className="font-headline-sm font-bold text-on-surface">Pause Membership</h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <p className="font-body-md text-on-surface-variant">
                Pause {member.firstName}&apos;s membership pass. The expiration date will automatically shift forward upon resumption.
              </p>

              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface font-medium">Pause Reason</label>
                <select
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-bright border border-border-delicate font-body-md"
                >
                  <option value="Medical recovery">Medical recovery / Doctor advice</option>
                  <option value="Travel">Work / Personal travel</option>
                  <option value="Personal temporary">Personal temporary pause</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-md text-on-surface font-medium">Expected Duration</label>
                <select
                  value={pauseWeeks}
                  onChange={(e) => setPauseWeeks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-bright border border-border-delicate font-body-md"
                >
                  <option value="2">2 Weeks</option>
                  <option value="4">4 Weeks (1 Month)</option>
                  <option value="8">8 Weeks (2 Months)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-delicate">
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-border-delicate hover:bg-surface-container text-on-surface font-label-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handlePause}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md font-semibold hover:bg-primary-container disabled:opacity-50"
                >
                  {submittingAction ? 'Pausing...' : 'Confirm Pause'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: RENEW MEMBERSHIP */}
        {activeModal === 'renew' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs">
            <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-delicate flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-delicate">
                <h3 className="font-headline-sm font-bold text-on-surface">Renew Membership</h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <p className="font-body-md text-on-surface-variant">
                Renew {member.membership.planName} for another cycle starting after {member.membership.endsAt}.
              </p>

              <div className="p-4 rounded-xl bg-surface-bright border border-border-delicate">
                <span className="font-label-sm text-text-muted">Total Renewal Amount</span>
                <p className="font-headline-md font-bold text-on-surface mt-1">
                  ₹{(member.membership.priceCents / 100).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-delicate">
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-border-delicate hover:bg-surface-container text-on-surface font-label-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handleRenew}
                  className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-label-md font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {submittingAction ? 'Renewing...' : 'Confirm Renewal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: RESUME MEMBERSHIP */}
        {activeModal === 'resume' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs">
            <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-delicate flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-delicate">
                <h3 className="font-headline-sm font-bold text-on-surface">Resume Membership</h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <p className="font-body-md text-on-surface-variant">
                Resume {member.firstName}&apos;s membership pass effective immediately. The expiration date has been shifted forward by the pause duration.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-delicate">
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-border-delicate hover:bg-surface-container text-on-surface font-label-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handleResume}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md font-semibold hover:bg-primary-container disabled:opacity-50"
                >
                  {submittingAction ? 'Resuming...' : 'Confirm Resume'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CANCEL MEMBERSHIP */}
        {activeModal === 'cancel' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs">
            <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-delicate flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-delicate">
                <h3 className="font-headline-sm font-bold text-error">Cancel Membership</h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <p className="font-body-md text-on-surface-variant">
                Are you sure you want to cancel {member.firstName}&apos;s membership? The member will no longer have active studio check-in privileges.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-delicate">
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-border-delicate hover:bg-surface-container text-on-surface font-label-md font-medium"
                >
                  Keep Pass
                </button>
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl bg-error text-on-error font-label-md font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {submittingAction ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
