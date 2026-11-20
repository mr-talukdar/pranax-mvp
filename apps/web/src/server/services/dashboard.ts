import 'server-only';

import { withVerifiedStudioContext } from '@pranax/database';
import {
  dashboardQuerySchema,
  type AttentionQueueItemContract,
  type DashboardKPIsContract,
  type DashboardQueryInput,
} from '@pranax/contracts';
import type { StudioContext } from '../auth/context';

export function getStudioLocalDate(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatTrendLabel(dateUtc: Date, isToday: boolean): string {
  const day = dateUtc.getUTCDate();
  if (isToday) {
    return `Today (${day})`;
  }
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = monthNames[dateUtc.getUTCMonth()];
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  return `${month} ${formattedDay}`;
}

export async function getDashboardSummary(
  context: StudioContext,
  query?: DashboardQueryInput,
): Promise<DashboardKPIsContract> {
  const queryParams = dashboardQuerySchema.parse(query ?? {});

  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    async (tx) => {
      const studio = await tx.studio.findUnique({
        where: { id: context.studioId },
        select: { id: true, name: true, timezone: true },
      });

      if (!studio) {
        throw new Error('Studio not found or access denied.');
      }

      const timezone = studio.timezone || 'UTC';
      const asOfDateStr =
        queryParams.asOfDate ?? getStudioLocalDate(new Date(), timezone);
      const todayUtc = new Date(`${asOfDateStr}T00:00:00.000Z`);
      const todayEndUtc = new Date(`${asOfDateStr}T23:59:59.999Z`);

      // 1. Total Members
      const totalMembers = await tx.member.count({
        where: { studioId: context.studioId },
      });

      // 2. New Registrations in reporting period
      const registrationDays = queryParams.registrationWindowDays;
      const registrationStartUtc = new Date(
        todayUtc.getTime() - registrationDays * 86_400_000,
      );
      const newRegistrations = await tx.member.count({
        where: {
          studioId: context.studioId,
          joinedAt: {
            gte: registrationStartUtc,
            lte: todayEndUtc,
          },
        },
      });

      // 3. Attendance Today (Unique check-ins for studio's local calendar date)
      const attendanceToday = await tx.attendanceRecord.count({
        where: {
          studioId: context.studioId,
          localDate: todayUtc,
        },
      });

      // 4. Membership Breakdown & Active Members
      const upcomingExpDays = queryParams.upcomingExpirationDays;
      const expiringThresholdUtc = new Date(
        todayUtc.getTime() + upcomingExpDays * 86_400_000,
      );

      const membershipPeriods = await tx.membershipPeriod.findMany({
        where: {
          studioId: context.studioId,
          OR: [
            { status: 'ACTIVE' },
            { status: 'PAUSED' },
            { status: 'EXPIRED' },
            { effectiveEndsAt: { gte: todayUtc } },
          ],
        },
        include: {
          pauses: {
            where: {
              startsAt: { lte: todayUtc },
              OR: [{ resumesAt: null }, { resumesAt: { gt: todayUtc } }],
            },
          },
        },
      });

      const activeMemberIds = new Set<string>();
      const pausedMemberIds = new Set<string>();
      const expiringMemberIds = new Set<string>();
      const expiredMemberIds = new Set<string>();

      for (const period of membershipPeriods) {
        const isCancelled =
          period.cancelledAt !== null && period.cancelledAt <= todayEndUtc;
        if (isCancelled) continue;

        const isDateCurrent =
          period.startsAt <= todayUtc && period.effectiveEndsAt >= todayUtc;
        const hasActivePause = period.pauses.length > 0;

        if (period.status === 'ACTIVE' && isDateCurrent && !hasActivePause) {
          activeMemberIds.add(period.memberId);
          if (period.effectiveEndsAt <= expiringThresholdUtc) {
            expiringMemberIds.add(period.memberId);
          }
        } else if (
          (period.status === 'PAUSED' && period.effectiveEndsAt >= todayUtc) ||
          (isDateCurrent && hasActivePause)
        ) {
          pausedMemberIds.add(period.memberId);
        } else if (
          period.status === 'EXPIRED' ||
          period.effectiveEndsAt < todayUtc
        ) {
          expiredMemberIds.add(period.memberId);
        }
      }

      // Avoid double-counting: active takes precedence, then paused, then expired
      for (const id of activeMemberIds) {
        pausedMemberIds.delete(id);
        expiredMemberIds.delete(id);
      }
      for (const id of pausedMemberIds) {
        expiredMemberIds.delete(id);
      }

      const activeCount = activeMemberIds.size;
      const pausedCount = pausedMemberIds.size;
      const expiringCount = expiringMemberIds.size;
      const expiredCount = expiredMemberIds.size;

      const totalBreakdown = activeCount + pausedCount + expiredCount;
      const membershipBreakdown = {
        active: activeCount,
        activePercent:
          totalBreakdown > 0
            ? Math.round((activeCount / totalBreakdown) * 100)
            : 0,
        paused: pausedCount,
        pausedPercent:
          totalBreakdown > 0
            ? Math.round((pausedCount / totalBreakdown) * 100)
            : 0,
        expiring: expiringCount,
        expiringPercent:
          totalBreakdown > 0
            ? Math.round((expiringCount / totalBreakdown) * 100)
            : 0,
        expired: expiredCount,
        expiredPercent:
          totalBreakdown > 0
            ? Math.round((expiredCount / totalBreakdown) * 100)
            : 0,
      };

      // 5. Attendance Trends (zero-filled in the selected studio-local interval)
      const trendStartUtc =
        queryParams.trendInterval === 'daily'
          ? new Date(
              todayUtc.getTime() - (queryParams.trendDays - 1) * 86_400_000,
            )
          : new Date(
              Date.UTC(
                Number(asOfDateStr.slice(0, 4)),
                Number(asOfDateStr.slice(5, 7)) - queryParams.trendMonths,
                1,
              ),
            );

      const attendanceRecords = await tx.attendanceRecord.findMany({
        where: {
          studioId: context.studioId,
          localDate: {
            gte: trendStartUtc,
            lte: todayUtc,
          },
        },
        select: {
          localDate: true,
          memberId: true,
        },
      });

      // AttendanceRecord is unique per member per studio-local day.
      const attendanceCountByDate = new Map<string, number>();
      for (const record of attendanceRecords) {
        const localDate = record.localDate.toISOString().slice(0, 10);
        const dStr =
          queryParams.trendInterval === 'daily'
            ? localDate
            : localDate.slice(0, 7);
        attendanceCountByDate.set(
          dStr,
          (attendanceCountByDate.get(dStr) ?? 0) + 1,
        );
      }

      const attendanceTrends = [];
      if (queryParams.trendInterval === 'daily') {
        for (let i = queryParams.trendDays - 1; i >= 0; i--) {
          const dateObj = new Date(todayUtc.getTime() - i * 86_400_000);
          const dStr = dateObj.toISOString().slice(0, 10);
          attendanceTrends.push({
            date: dStr,
            label: formatTrendLabel(dateObj, i === 0),
            count: attendanceCountByDate.get(dStr) ?? 0,
          });
        }
      } else {
        const [asOfYear, asOfMonth] = asOfDateStr.split('-').map(Number);
        for (let i = queryParams.trendMonths - 1; i >= 0; i--) {
          const dateObj = new Date(Date.UTC(asOfYear, asOfMonth - 1 - i, 1));
          const monthKey = dateObj.toISOString().slice(0, 7);
          attendanceTrends.push({
            date: `${monthKey}-01`,
            label: dateObj.toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit',
              timeZone: 'UTC',
            }),
            count: attendanceCountByDate.get(monthKey) ?? 0,
          });
        }
      }

      // 6. Retention Overview & 7. Attention Queue
      const snapshots = await tx.retentionSnapshot.findMany({
        where: { studioId: context.studioId },
        orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              joinedAt: true,
              membershipPeriods: {
                where: {
                  status: 'ACTIVE',
                  startsAt: { lte: todayUtc },
                  effectiveEndsAt: { gte: todayUtc },
                },
                include: { plan: { select: { name: true } } },
                take: 1,
              },
              attendanceRecords: {
                orderBy: { localDate: 'desc' },
                take: 1,
                select: { localDate: true },
              },
            },
          },
        },
      });

      // Deduplicate to latest snapshot per member (ensuring order by snapshotDate desc, createdAt desc)
      const sortedSnapshots = [...snapshots].sort((a, b) => {
        const dateDiff =
          new Date(b.snapshotDate).getTime() -
          new Date(a.snapshotDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      const latestSnapshotByMember = new Map<
        string,
        (typeof snapshots)[number]
      >();
      for (const s of sortedSnapshots) {
        if (!latestSnapshotByMember.has(s.memberId)) {
          latestSnapshotByMember.set(s.memberId, s);
        }
      }

      let lowCount = 0;
      let mediumCount = 0;
      let highCount = 0;
      let limitedCount = 0;

      const attentionCandidates: AttentionQueueItemContract[] = [];

      for (const snapshot of latestSnapshotByMember.values()) {
        const isComplete = snapshot.isComplete;
        const category = snapshot.category?.toUpperCase();

        if (!isComplete || category === 'LIMITED') {
          limitedCount++;
        } else if (category === 'LOW') {
          lowCount++;
        } else if (category === 'MEDIUM') {
          mediumCount++;
        } else if (category === 'HIGH') {
          highCount++;
        }

        if (
          category === 'HIGH' ||
          category === 'MEDIUM' ||
          !isComplete ||
          category === 'LIMITED'
        ) {
          const mem = snapshot.member;
          const memberName = `${mem.firstName} ${mem.lastName}`.trim();
          const initials =
            `${mem.firstName[0] ?? ''}${mem.lastName[0] ?? ''}`.toUpperCase() ||
            'M';
          const planName =
            mem.membershipPeriods[0]?.plan?.name ?? 'Standard Membership';

          let daysAbsent = 0;
          if (mem.attendanceRecords[0]?.localDate) {
            const lastDate = new Date(mem.attendanceRecords[0].localDate);
            daysAbsent = Math.max(
              0,
              Math.floor(
                (todayUtc.getTime() - lastDate.getTime()) / 86_400_000,
              ),
            );
          } else if (mem.joinedAt) {
            daysAbsent = Math.max(
              0,
              Math.floor(
                (todayUtc.getTime() - new Date(mem.joinedAt).getTime()) /
                  86_400_000,
              ),
            );
          }

          let cadenceDrop =
            daysAbsent > 14
              ? `Absent for ${daysAbsent} days`
              : 'Attendance declining';
          const keyFactors: string[] = [];

          if (Array.isArray(snapshot.indicators)) {
            for (const ind of snapshot.indicators as Array<{
              code?: string;
              explanation?: string;
            }>) {
              if (
                ind.code?.includes('attendance') ||
                ind.code?.includes('frequency') ||
                ind.code?.includes('cadence')
              ) {
                if (ind.explanation) cadenceDrop = ind.explanation;
              }
              if (ind.explanation && keyFactors.length < 3) {
                keyFactors.push(ind.explanation);
              }
            }
          }

          if (keyFactors.length === 0) {
            if (daysAbsent > 0) {
              keyFactors.push(`Zero check-ins in ${daysAbsent} days`);
            }
            if (snapshot.score > 70) {
              keyFactors.push(`High risk retention score: ${snapshot.score}`);
            }
          }

          const metadata = snapshot.assessmentMetadata as {
            recommendation?: { title?: string; explanation?: string };
          } | null;
          if (metadata?.recommendation?.explanation && keyFactors.length < 3) {
            keyFactors.push(metadata.recommendation.explanation);
          }

          const primaryRecommendation =
            snapshot.recommendation ||
            metadata?.recommendation?.title ||
            'Direct check-in with member to assess satisfaction and schedule a session';

          const queueCategory: 'HIGH' | 'MEDIUM' | 'LIMITED' =
            category === 'HIGH'
              ? 'HIGH'
              : category === 'MEDIUM'
                ? 'MEDIUM'
                : 'LIMITED';

          attentionCandidates.push({
            memberId: snapshot.memberId,
            memberName,
            memberInitials: initials,
            planName,
            score: snapshot.score,
            category: queueCategory,
            daysAbsent,
            cadenceDrop,
            primaryRecommendation,
            keyFactors,
          });
        }
      }

      const categoryPriority: Record<'HIGH' | 'MEDIUM' | 'LIMITED', number> = {
        HIGH: 3,
        MEDIUM: 2,
        LIMITED: 1,
      };

      attentionCandidates.sort((a, b) => {
        const catDiff =
          categoryPriority[b.category] - categoryPriority[a.category];
        if (catDiff !== 0) return catDiff;
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        return b.daysAbsent - a.daysAbsent;
      });

      const totalAssessed = lowCount + mediumCount + highCount + limitedCount;
      const retentionSummary = {
        lowCount,
        lowPercent:
          totalAssessed > 0 ? Math.round((lowCount / totalAssessed) * 100) : 0,
        mediumCount,
        mediumPercent:
          totalAssessed > 0
            ? Math.round((mediumCount / totalAssessed) * 100)
            : 0,
        highCount,
        highPercent:
          totalAssessed > 0 ? Math.round((highCount / totalAssessed) * 100) : 0,
        limitedCount,
        limitedPercent:
          totalAssessed > 0
            ? Math.round((limitedCount / totalAssessed) * 100)
            : 0,
      };

      // 8. ML Insights (Optional DASH-06)
      const churnPredictionsCount = await tx.churnPrediction.count({
        where: { studioId: context.studioId },
      });
      const highRiskChurnCount =
        churnPredictionsCount > 0
          ? await tx.churnPrediction.count({
              where: {
                studioId: context.studioId,
                probability: { gte: 0.6 },
              },
            })
          : 0;

      const mlInsights = {
        enabled: churnPredictionsCount > 0,
        modelStatus:
          churnPredictionsCount > 0
            ? ('ACTIVE' as const)
            : ('DISABLED' as const),
        highRiskChurnCount,
      };

      return {
        activeMembers: activeCount,
        totalMembers,
        newRegistrations,
        attendanceToday,
        highRiskCount: highCount,
        expiringIn7Days: expiringCount,
        membershipBreakdown,
        attendanceTrends,
        retentionSummary,
        attentionQueue: attentionCandidates.slice(0, 10),
        studioTimezone: timezone,
        asOfDate: asOfDateStr,
        mlInsights,
      };
    },
    { timeout: 60_000 },
  );
}
