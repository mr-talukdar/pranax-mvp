import { describe, expect, it } from 'vitest';
import {
  dashboardKPIsSchema,
  dashboardQuerySchema,
  dashboardResponseSchema,
  attentionQueueItemSchema,
} from './dashboard.js';

describe('dashboard contracts', () => {
  it('validates a valid dashboard query input', () => {
    const parsed = dashboardQuerySchema.parse({
      asOfDate: '2026-06-25',
      registrationWindowDays: '30',
      trendDays: '14',
    });
    expect(parsed.asOfDate).toBe('2026-06-25');
    expect(parsed.registrationWindowDays).toBe(30);
    expect(parsed.trendDays).toBe(14);
    expect(parsed.upcomingExpirationDays).toBe(7);
  });

  it('validates a full dashboard KPIs response object', () => {
    const validKPIs = {
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
      attendanceTrends: [
        { date: '2026-06-24', label: 'Jun 24', count: 46 },
        { date: '2026-06-25', label: 'Today (25)', count: 42 },
      ],
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
      attentionQueue: [
        {
          memberId: '11111111-1111-4000-8000-000000000008',
          memberName: "Liam O'Connor",
          memberInitials: 'LO',
          planName: 'Standard Monthly',
          score: 84,
          category: 'HIGH',
          daysAbsent: 18,
          cadenceDrop: 'Drop of -95% in past 21d',
          primaryRecommendation: 'Direct WhatsApp check-in',
          keyFactors: ['Zero bookings in 18 days', 'Renewal due immediately'],
        },
      ],
      studioTimezone: 'Asia/Kolkata',
      asOfDate: '2026-06-25',
      mlInsights: {
        enabled: true,
        modelStatus: 'ACTIVE',
        highRiskChurnCount: 3,
      },
    };

    const parsed = dashboardResponseSchema.parse({ data: validKPIs });
    expect(parsed.data.activeMembers).toBe(248);
    expect(parsed.data.attentionQueue).toHaveLength(1);
    expect(parsed.data.attentionQueue[0].category).toBe('HIGH');
  });

  it('rejects invalid attention queue categories', () => {
    expect(() =>
      attentionQueueItemSchema.parse({
        memberId: '11111111-1111-4000-8000-000000000008',
        memberName: 'Invalid Member',
        memberInitials: 'IM',
        planName: 'Plan',
        score: 50,
        category: 'UNKNOWN',
        daysAbsent: 5,
        cadenceDrop: 'None',
        primaryRecommendation: 'Action',
        keyFactors: [],
      }),
    ).toThrow();
  });
});
