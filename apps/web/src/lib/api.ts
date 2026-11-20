import type {
  MemberDetail,
  MemberSummary,
  DashboardKPIs,
  AttendanceItem,
} from './types';
import {
  mockMembers,
  mockDashboardKPIs,
  mockAttendanceRecords,
  mockStudioContext,
} from './mockData';

export async function fetchMembers(): Promise<MemberSummary[]> {
  try {
    const res = await globalThis.fetch('/api/members', {
      headers: {
        'x-studio-id': mockStudioContext.id,
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        // Merge with mock details for rich UI display if basic fields returned
        return json.data.map((m: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null }) => {
          const match = mockMembers.find((mock) => mock.id === m.id);
          return {
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            phone: m.phone,
            joinedAt: match?.joinedAt ?? new Date().toISOString(),
            status: match?.status ?? 'ACTIVE',
            planName: match?.planName ?? 'Standard Membership',
            lastVisit: match?.lastVisit ?? 'Recent',
            cadence: match?.cadence ?? '1-2x / week',
            retentionCategory: match?.retentionCategory ?? 'LOW',
            retentionScore: match?.retentionScore ?? 20,
            avatarBg: match?.avatarBg ?? 'bg-primary',
          };
        });
      }
    }
  } catch (error) {
    console.warn('Backend /api/members unavailable, using mock data adapter', error);
  }
  return mockMembers;
}

export async function fetchMemberById(id: string): Promise<MemberDetail | undefined> {
  const members = await fetchMembers();
  const summary = members.find((m) => m.id === id);
  if (!summary) return mockMembers[0]; // fallback for demo routing
  const fullMock = mockMembers.find((m) => m.id === id);
  return {
    ...summary,
    emergencyContact: fullMock?.emergencyContact,
    notes: fullMock?.notes,
    membership: fullMock?.membership ?? {
      planId: 'plan-default',
      planName: summary.planName,
      startsAt: '2026-06-01',
      endsAt: '2026-06-30',
      priceCents: 1000000,
      status: summary.status,
      renewalDueDays: 14,
    },
  };
}

export async function createMemberApi(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}): Promise<{ id: string; firstName: string; lastName: string }> {
  try {
    const res = await globalThis.fetch('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-studio-id': mockStudioContext.id,
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (error) {
    console.warn('Failed to call real member create, simulating success', error);
  }
  return {
    id: `temp-${Date.now()}`,
    firstName: data.firstName,
    lastName: data.lastName,
  };
}

export async function fetchMemberRetention(memberId: string) {
  try {
    const res = await globalThis.fetch(`/api/members/${memberId}/retention`, {
      headers: {
        'x-studio-id': mockStudioContext.id,
      },
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback to mock response
  }
  return null;
}

export async function fetchDashboardData(options?: {
  asOfDate?: string;
  studioId?: string;
}): Promise<DashboardKPIs> {
  try {
    const studioId = options?.studioId ?? mockStudioContext.id;
    const queryStr = options?.asOfDate
      ? `?asOfDate=${encodeURIComponent(options.asOfDate)}`
      : '';

    const res = await globalThis.fetch(`/api/dashboard${queryStr}`, {
      headers: {
        'x-studio-id': studioId,
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        return json.data;
      }
    }
  } catch (error) {
    console.warn('Backend /api/dashboard unavailable, using mock data fallback', error);
  }
  return mockDashboardKPIs;
}

export async function fetchAttendanceRecords(): Promise<AttendanceItem[]> {
  return mockAttendanceRecords;
}
