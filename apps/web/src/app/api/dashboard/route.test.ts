import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getStudioContext, getDashboardSummary } = vi.hoisted(() => ({
  getStudioContext: vi.fn(),
  getDashboardSummary: vi.fn(),
}));

vi.mock('../../../server/auth/context', () => ({
  getStudioContext,
}));
vi.mock('../../../server/services/dashboard', () => ({
  getDashboardSummary,
}));

import { GET } from './route';

describe('GET /api/dashboard', () => {
  const verifiedContext = {
    authUserId: 'user-123',
    studioId: 'studio-456',
  };

  const sampleKPIs = {
    activeMembers: 248,
    totalMembers: 312,
    newRegistrations: 14,
    attendanceToday: 42,
    highRiskCount: 12,
    expiringIn7Days: 15,
    membershipBreakdown: {
      active: 248,
      activePercent: 80,
      paused: 21,
      pausedPercent: 7,
      expiring: 15,
      expiringPercent: 5,
      expired: 28,
      expiredPercent: 8,
    },
    attendanceTrends: [{ date: '2026-06-25', label: 'Today (25)', count: 42 }],
    retentionSummary: {
      lowCount: 218,
      lowPercent: 77,
      mediumCount: 45,
      mediumPercent: 16,
      highCount: 12,
      highPercent: 4,
      limitedCount: 9,
      limitedPercent: 3,
    },
    attentionQueue: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and dashboard KPIs for verified studio context', async () => {
    getStudioContext.mockResolvedValue(verifiedContext);
    getDashboardSummary.mockResolvedValue(sampleKPIs);

    const request = new Request('http://localhost/api/dashboard?asOfDate=2026-06-25', {
      headers: { 'x-studio-id': 'studio-456' },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getStudioContext).toHaveBeenCalledWith('studio-456', undefined);
    expect(getDashboardSummary).toHaveBeenCalledWith(
      verifiedContext,
      expect.objectContaining({ asOfDate: '2026-06-25' }),
    );
    expect(await response.json()).toEqual({ data: sampleKPIs });
  });

  it('rejects requests without verified studio context with 400', async () => {
    getStudioContext.mockResolvedValue(undefined);

    const request = new Request('http://localhost/api/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(getDashboardSummary).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: 'A server-established studio context is required.',
    });
  });

  it('rejects invalid query parameters with 400', async () => {
    getStudioContext.mockResolvedValue(verifiedContext);

    const request = new Request('http://localhost/api/dashboard?asOfDate=invalid-date');
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(getDashboardSummary).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.error).toContain('Invalid dashboard query parameters.');
  });

  it('returns 500 when service throws an unexpected error', async () => {
    getStudioContext.mockResolvedValue(verifiedContext);
    getDashboardSummary.mockRejectedValue(new Error('Database failure'));

    const request = new Request('http://localhost/api/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('unexpected server error');
  });
});
