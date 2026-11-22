'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../components/shell/AppShell';
import type { AttendanceItem, MemberSummary } from '../../../lib/types';
import { fetchAttendanceRecords, fetchMembers, recordCheckInApi } from '../../../lib/api';

export default function AttendancePage() {
  const [viewMode, setViewMode] = useState<'live' | 'history'>('live');
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [searchMember, setSearchMember] = useState('');
  const [selectedClass, setSelectedClass] = useState('Advanced Reformer Flow (09:30 AM)');
  const [selectedInstructor, setSelectedInstructor] = useState('Ritu Sen');
  const [filterDate, setFilterDate] = useState<'today' | 'week' | 'month'>('today');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAttendance = async () => {
    try {
      const att = await fetchAttendanceRecords({ limit: 50 });
      setRecords(att.records);
    } catch (err) {
      console.error('Failed to load attendance records', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchMembers({ limit: 100 }),
      fetchAttendanceRecords({ limit: 50 }),
    ])
      .then(([membersRes, attRes]) => {
        setMembers(membersRes.members);
        setRecords(attRes.records);
      })
      .catch((err) => {
        console.error('Failed to initialize attendance feed', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCheckIn = async (memberId: string) => {
    try {
      const result = await recordCheckInApi({
        memberId,
        occurredAt: new Date().toISOString(),
      });
      const member = members.find((m) => m.id === memberId);
      const name = member ? `${member.firstName} ${member.lastName}` : 'Member';

      if (result.alreadyCheckedIn) {
        setFeedbackMsg(`${name} was already checked in for today.`);
      } else {
        const warningSuffix = result.warning ? ` (${result.warning.message})` : '';
        setFeedbackMsg(`Checked in ${name} successfully!${warningSuffix}`);
      }
      setSearchMember('');
      await loadAttendance();
      globalThis.setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Check-in failed');
      globalThis.setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const candidateMembers = useMemo(() => {
    if (!searchMember.trim()) return [];
    const q = searchMember.toLowerCase();
    return members.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false)
    );
  }, [searchMember, members]);

  return (
    <AppShell title="Attendance">
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-space-lg">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                Attendance
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sage-tint border border-sage-border">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-sm text-label-sm font-semibold text-secondary uppercase tracking-wider">
                  Live Feed
                </span>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Check-in desk console, daily class rosters, and historical attendance logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/studio/attendance/import"
              className="px-3.5 py-2 rounded-xl border border-border-delicate bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Import Attendance CSV</span>
            </Link>
          </div>
        </div>

        {/* View Switcher Bar */}
        <div className="flex items-center justify-between p-1.5 bg-surface-container-lowest rounded-xl border border-border-delicate shadow-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('live')}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'live'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">touch_app</span>
              <span>Live Check-in Console</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'history'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              <span>Attendance History</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pr-2 text-on-surface-variant font-label-md text-label-md">
            <span>Logged Today: </span>
            <span className="font-bold text-on-surface">{records.length} check-ins</span>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-4 rounded-xl bg-sage-tint border border-sage-border text-secondary font-label-md text-label-md font-semibold flex items-center gap-2 shadow-xs transition-all animate-bounce">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* LIVE CHECK-IN VIEW (ATT-01) */}
        {viewMode === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Left 5 cols: Check-in Action Box */}
            <div className="lg:col-span-5 flex flex-col gap-space-md">
              <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 shadow-xs flex flex-col gap-4">
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    how_to_reg
                  </span>
                  Manual Attendee Check-In
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Search member to instantly record studio presence for today.
                </p>

                {/* Class & Instructor Selectors */}
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm font-medium text-on-surface">
                      Current Class Session
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md"
                    >
                      <option value="Advanced Reformer Flow (09:30 AM)">Advanced Reformer Flow (09:30 AM)</option>
                      <option value="Sunrise Mat Pilates (07:15 AM)">Sunrise Mat Pilates (07:15 AM)</option>
                      <option value="Tower & Core Sculpt (05:45 PM)">Tower & Core Sculpt (05:45 PM)</option>
                      <option value="Athletic Reformer Jumpboard (06:30 PM)">Athletic Reformer Jumpboard (06:30 PM)</option>
                      <option value="Intro to Reformer & Posture (11:00 AM)">Intro to Reformer & Posture (11:00 AM)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm font-medium text-on-surface">
                      Instructor on Duty
                    </label>
                    <select
                      value={selectedInstructor}
                      onChange={(e) => setSelectedInstructor(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md"
                    >
                      <option value="Ritu Sen">Ritu Sen</option>
                      <option value="Akash Ghosal">Akash Ghosal</option>
                      <option value="Sneha Bose">Sneha Bose</option>
                    </select>
                  </div>
                </div>

                {/* Member Search Bar */}
                <div className="flex flex-col gap-1 pt-2">
                  <label className="font-label-sm text-label-sm font-medium text-on-surface">
                    Find Member
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-outline absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchMember}
                      onChange={(e) => setSearchMember(e.target.value)}
                      placeholder="Type member name or email..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Autocomplete Candidate Results */}
                {candidateMembers.length > 0 && (
                  <div className="max-h-60 overflow-y-auto divide-y divide-border-delicate border border-border-delicate rounded-xl bg-surface-bright p-1">
                    {candidateMembers.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 flex items-center justify-between hover:bg-surface-container rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleCheckIn(m.id)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-bold text-label-sm flex items-center justify-center">
                            {m.firstName[0]}
                            {m.lastName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-on-surface font-label-md text-label-md">
                              {m.firstName} {m.lastName}
                            </p>
                            <p className="font-body-sm text-body-sm text-text-muted">{m.planName}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCheckIn(m.id)}
                          className="px-2.5 py-1 rounded bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary-container"
                        >
                          Check In
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 7 cols: Today's Live Attendee List */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-delicate">
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    Today&apos;s Check-Ins
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                    {records.length} Total
                  </span>
                </div>
                <span className="text-text-muted font-body-sm">Sorted by most recent</span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-text-muted font-body-md animate-pulse">
                  Loading attendance feed...
                </div>
              ) : records.length === 0 ? (
                <div className="p-8 text-center text-text-muted font-body-md">
                  No attendance records logged today yet.
                </div>
              ) : (
                <div className="divide-y divide-border-delicate overflow-x-auto">
                {records.map((record) => (
                  <div key={record.id} className="py-3 flex items-center justify-between gap-4 hover:bg-surface-bright px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-label-md text-on-surface">
                        {record.memberName[0]}
                      </div>
                      <div>
                        <Link
                          href={`/studio/members/${record.memberId}`}
                          className="font-semibold text-on-surface hover:text-primary transition-colors font-body-md"
                        >
                          {record.memberName}
                        </Link>
                        <p className="text-text-muted font-body-sm">
                          {record.classType} • {record.instructor}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface block">
                        {new Date(record.checkedInAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-body-sm text-body-sm text-text-muted">
                        {record.terminal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {/* ATTENDANCE HISTORY VIEW (ATT-02) */}
        {viewMode === 'history' && (
          <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-delicate">
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Historical Check-In Records
              </h2>

              <div className="flex items-center gap-2">
                {(['today', 'week', 'month'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setFilterDate(period)}
                    className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold uppercase ${
                      filterDate === period
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-body-md text-body-md">
                <thead>
                  <tr className="border-b border-border-delicate text-on-surface-variant font-label-sm">
                    <th className="py-3 font-semibold">Timestamp</th>
                    <th className="py-3 font-semibold">Member</th>
                    <th className="py-3 font-semibold">Session Class</th>
                    <th className="py-3 font-semibold">Instructor</th>
                    <th className="py-3 font-semibold">Source</th>
                    <th className="py-3 font-semibold">Terminal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-delicate">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-bright">
                      <td className="py-3.5">
                        {new Date(r.checkedInAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3.5 font-semibold text-on-surface">
                        <Link href={`/studio/members/${r.memberId}`} className="hover:text-primary">
                          {r.memberName}
                        </Link>
                      </td>
                      <td className="py-3.5 text-on-surface">{r.classType}</td>
                      <td className="py-3.5 text-on-surface-variant">{r.instructor}</td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container">
                          {r.source}
                        </span>
                      </td>
                      <td className="py-3.5 text-text-muted text-body-sm">{r.terminal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
