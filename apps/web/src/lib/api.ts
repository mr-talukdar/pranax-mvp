import type {
  MemberDetail,
  MemberSummary,
  DashboardKPIs,
  AttendanceItem,
  MembershipStatusType,
} from './types';

type ApiMemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  joinedAt: string;
  currentMembership?: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    startsAt: string;
    effectiveEndsAt: string;
  } | null;
  lastVisit?: string | null;
  retentionCategory?: 'LOW' | 'MEDIUM' | 'HIGH' | 'LIMITED' | null;
  retentionScore?: number | null;
};

type ApiPauseRow = {
  id?: string;
  startsAt: string;
  resumesAt?: string | null;
};

type ApiAttendanceRow = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail?: string | null;
  occurredAt: string;
  source?: 'MANUAL' | 'CSV';
};

export async function getAuthHeaders(
  extraHeaders: Record<string, string> = {},
): Promise<Record<string, string>> {
  return { ...extraHeaders };
}

function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return globalThis.fetch(input, { ...init, credentials: 'include' });
}

export async function fetchDashboardData(options?: {
  asOfDate?: string;
  trendInterval?: 'daily' | 'monthly';
}): Promise<DashboardKPIs> {
  const params = new URLSearchParams();
  if (options?.asOfDate) params.set('asOfDate', options.asOfDate);
  if (options?.trendInterval)
    params.set('trendInterval', options.trendInterval);
  const queryStr = params.size ? `?${params.toString()}` : '';
  const headers = await getAuthHeaders();

  const res = await apiFetch(`/api/dashboard${queryStr}`, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson.error ||
        `Failed to fetch dashboard metrics (Status: ${res.status})`,
    );
  }

  const json = await res.json();
  if (!json.data) {
    throw new Error('No dashboard data received from server');
  }

  return json.data as DashboardKPIs;
}

export async function fetchMembers(options?: {
  search?: string;
  status?: string;
  directoryFilter?:
    | 'all'
    | 'active'
    | 'paused'
    | 'expiring'
    | 'high_risk'
    | 'new';
  limit?: number;
  offset?: number;
  sort?: string;
}): Promise<{
  members: MemberSummary[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}> {
  const params = new URLSearchParams();
  if (options?.search) params.set('search', options.search);
  if (options?.status && options.status !== 'all')
    params.set('status', options.status);
  if (options?.directoryFilter && options.directoryFilter !== 'all')
    params.set('directoryFilter', options.directoryFilter);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.sort) params.set('sort', options.sort);

  const query = params.toString() ? `?${params.toString()}` : '';
  const headers = await getAuthHeaders();

  const res = await apiFetch(`/api/members${query}`, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson.error || `Failed to fetch members (Status: ${res.status})`,
    );
  }

  const json = await res.json();
  const avatarBgs = [
    'bg-primary',
    'bg-secondary',
    'bg-tertiary',
    'bg-emerald-600',
    'bg-indigo-600',
    'bg-teal-600',
  ];

  const members: MemberSummary[] = (json.data ?? []).map(
    (m: ApiMemberRow, index: number) => {
      const rawStatus = m.currentMembership?.status ?? 'EXPIRED';
      const status: MembershipStatusType =
        rawStatus === 'ACTIVE' ||
        rawStatus === 'PAUSED' ||
        rawStatus === 'CANCELLED'
          ? rawStatus
          : 'EXPIRED';

      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: m.phone,
        joinedAt: m.joinedAt,
        status,
        planName: m.currentMembership?.planName ?? 'No Active Pass',
        lastVisit: m.lastVisit ?? null,
        cadence: status === 'ACTIVE' ? 'Active Member' : 'Inactive / Paused',
        retentionCategory: m.retentionCategory ?? null,
        retentionScore: m.retentionScore ?? null,
        avatarBg: avatarBgs[index % avatarBgs.length],
      };
    },
  );

  const pagination = json.pagination ?? {};
  return {
    members,
    total: pagination.total ?? members.length,
    limit: pagination.limit ?? options?.limit ?? members.length,
    offset: pagination.offset ?? options?.offset ?? 0,
    hasMore: pagination.hasMore ?? false,
  };
}

export async function fetchMemberById(id: string): Promise<MemberDetail> {
  const headers = await getAuthHeaders();

  const [memberRes, membershipsRes, attendanceRes, retentionRes] =
    await Promise.all([
      apiFetch(`/api/members/${id}`, { headers, cache: 'no-store' }),
      apiFetch(`/api/members/${id}/memberships`, {
        headers,
        cache: 'no-store',
      }).catch(() => null),
      apiFetch(`/api/members/${id}/attendance`, {
        headers,
        cache: 'no-store',
      }).catch(() => null),
      apiFetch(`/api/members/${id}/retention`, {
        headers,
        cache: 'no-store',
      }).catch(() => null),
    ]);

  if (!memberRes.ok) {
    const err = await memberRes.json().catch(() => ({}));
    throw new Error(
      err.error ||
        `Failed to load member profile (Status: ${memberRes.status})`,
    );
  }

  const memberJson = await memberRes.json();
  const m = memberJson.data;

  const membershipsJson =
    membershipsRes && membershipsRes.ok
      ? await membershipsRes.json()
      : { data: [] };
  const history = Array.isArray(membershipsJson.data)
    ? membershipsJson.data
    : [];

  const retentionJson =
    retentionRes && retentionRes.ok ? await retentionRes.json() : null;
  const retentionData = retentionJson?.data;

  const attendanceJson =
    attendanceRes && attendanceRes.ok
      ? await attendanceRes.json()
      : { data: [] };
  const attendanceList = Array.isArray(attendanceJson.data)
    ? attendanceJson.data
    : [];

  const primaryPeriod = m.currentMembership ?? history[0];
  const rawStatus = primaryPeriod?.status ?? 'EXPIRED';
  const status: MembershipStatusType =
    rawStatus === 'ACTIVE' ||
    rawStatus === 'PAUSED' ||
    rawStatus === 'CANCELLED'
      ? rawStatus
      : 'EXPIRED';

  const pauseHistory = Array.isArray(primaryPeriod?.pauses)
    ? primaryPeriod.pauses.map((p: ApiPauseRow) => ({
        startDate: p.startsAt?.slice(0, 10) ?? '',
        endDate: p.resumesAt?.slice(0, 10) ?? null,
        reason: 'Temporary pause',
      }))
    : [];

  let renewalDueDays: number | undefined;
  if (primaryPeriod?.effectiveEndsAt) {
    const end = new Date(primaryPeriod.effectiveEndsAt).getTime();
    const now = Date.now();
    renewalDueDays = Math.ceil((end - now) / 86_400_000);
  }

  return {
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    phone: m.phone,
    joinedAt: m.joinedAt,
    status,
    planName: primaryPeriod?.planName ?? 'No Active Plan',
    lastVisit: attendanceList[0]?.occurredAt ?? null,
    cadence: m.metrics?.attendanceCount30d
      ? `${m.metrics.attendanceCount30d} visits / 30d`
      : 'Standard Cadence',
    retentionCategory: retentionData?.category ?? null,
    retentionScore: retentionData?.score ?? null,
    retentionAssessment: retentionData ?? null,
    avatarBg: 'bg-primary',
    emergencyContact: undefined,
    notes: m.notes ?? undefined,
    membership: {
      planId: primaryPeriod?.planId ?? primaryPeriod?.id ?? 'default-plan',
      planName: primaryPeriod?.planName ?? 'No Active Plan',
      startsAt: primaryPeriod?.startsAt
        ? primaryPeriod.startsAt.slice(0, 10)
        : '2026-01-01',
      endsAt: primaryPeriod?.effectiveEndsAt
        ? primaryPeriod.effectiveEndsAt.slice(0, 10)
        : (primaryPeriod?.originalEndsAt?.slice(0, 10) ?? '2026-12-31'),
      priceCents: primaryPeriod?.priceCents ?? 1000000,
      status,
      renewalDueDays,
      pauseHistory,
    },
  };
}

export async function createMemberApi(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}): Promise<{ id: string; firstName: string; lastName: string }> {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });

  const res = await apiFetch('/api/members', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson.error || `Failed to create member (Status: ${res.status})`,
    );
  }

  const json = await res.json();
  return json.data;
}

export async function pauseMembershipApi(
  memberId: string,
  periodId: string,
  data: { startsAt?: string; resumesAt?: string },
): Promise<Record<string, unknown>> {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });

  const res = await apiFetch(
    `/api/members/${memberId}/memberships/${periodId}/pause`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to pause membership (${res.status})`);
  }

  return res.json();
}

export async function resumeMembershipApi(
  memberId: string,
  periodId: string,
  data?: { resumesAt?: string },
): Promise<Record<string, unknown>> {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });

  const res = await apiFetch(
    `/api/members/${memberId}/memberships/${periodId}/resume`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(data ?? {}),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to resume membership (${res.status})`);
  }

  return res.json();
}

export async function renewMembershipApi(
  memberId: string,
  periodId: string,
  data?: { planId?: string; startsAt?: string },
): Promise<Record<string, unknown>> {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });

  const res = await apiFetch(
    `/api/members/${memberId}/memberships/${periodId}/renew`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(data ?? {}),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to renew membership (${res.status})`);
  }

  return res.json();
}

export async function cancelMembershipApi(
  memberId: string,
  periodId: string,
  data?: { effectiveEndsAt?: string; reason?: string },
): Promise<Record<string, unknown>> {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });

  const res = await apiFetch(
    `/api/members/${memberId}/memberships/${periodId}/cancel`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(data ?? {}),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to cancel membership (${res.status})`);
  }

  return res.json();
}

export async function fetchAttendanceRecords(options?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  memberId?: string;
}): Promise<{ records: AttendanceItem[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.memberId) params.set('memberId', options.memberId);

  const query = params.toString() ? `?${params.toString()}` : '';
  const headers = await getAuthHeaders();

  const res = await apiFetch(`/api/attendance${query}`, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson.error || `Failed to fetch attendance records (${res.status})`,
    );
  }

  const json = await res.json();
  const records: AttendanceItem[] = (json.data ?? []).map(
    (r: ApiAttendanceRow) => ({
      id: r.id,
      memberId: r.memberId,
      memberName: r.memberName,
      memberEmail: r.memberEmail ?? undefined,
      checkedInAt: r.occurredAt,
      classType: 'Pilates Studio Session',
      instructor: 'Studio Instructor',
      source: r.source ?? 'MANUAL',
      terminal: 'Front Kiosk Console',
    }),
  );

  return {
    records,
    total: json.pagination?.total ?? records.length,
  };
}

export async function recordCheckInApi(data: {
  memberId: string;
  occurredAt?: string;
}): Promise<{
  attendanceId: string;
  memberId: string;
  alreadyCheckedIn: boolean;
  warning?: { status: string; message: string } | null;
}> {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });

  const res = await apiFetch('/api/attendance/check-in', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson.error || `Failed to record check-in (${res.status})`,
    );
  }

  const json = await res.json();
  return json.data;
}

export async function importAttendanceCsvApi(
  payload:
    | { csvContent: string; sourceName?: string; idempotencyKey?: string }
    | FormData,
): Promise<{
  batchId: string;
  totalRows: number;
  importedCount: number;
  errorCount: number;
  duplicateCount: number;
  errors: Array<{ rowNumber: number; reason: string }>;
}> {
  const isFormData =
    typeof FormData !== 'undefined' && payload instanceof FormData;
  const headers = await getAuthHeaders(
    isFormData ? {} : { 'Content-Type': 'application/json' },
  );

  const res = await apiFetch('/api/attendance/import', {
    method: 'POST',
    headers,
    body: isFormData ? payload : JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || `Failed to import CSV (${res.status})`);
  }

  const json = await res.json();
  return json.data;
}
