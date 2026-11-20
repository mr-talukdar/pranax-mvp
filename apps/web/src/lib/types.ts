export type StudioContextInfo = {
  id: string;
  name: string;
  branch: string;
  role: string;
  ownerName: string;
  ownerInitials: string;
  timezone: string;
  isSynthetic: boolean;
};

export type MembershipStatusType = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';

export type MemberSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  joinedAt: string;
  status: MembershipStatusType;
  planName: string;
  lastVisit: string | null;
  cadence: string;
  retentionCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'LIMITED' | null;
  retentionScore: number | null;
  avatarBg?: string;
};

export type MemberDetail = MemberSummary & {
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
  membership: {
    planId: string;
    planName: string;
    startsAt: string;
    endsAt: string;
    priceCents: number;
    status: MembershipStatusType;
    renewalDueDays?: number;
    pauseHistory?: Array<{
      startDate: string;
      endDate: string | null;
      reason: string;
    }>;
  };
};

export type AttendanceItem = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
  checkedInAt: string;
  classType: string;
  instructor: string;
  source: 'MANUAL' | 'CSV';
  terminal: string;
};

export type AttentionQueueItem = {
  memberId: string;
  memberName: string;
  memberInitials: string;
  planName: string;
  score: number;
  category: 'HIGH' | 'MEDIUM' | 'LIMITED';
  daysAbsent: number;
  cadenceDrop: string;
  primaryRecommendation: string;
  keyFactors: string[];
};

export type DashboardKPIs = {
  activeMembers: number;
  totalMembers: number;
  newRegistrations: number;
  attendanceToday: number;
  highRiskCount: number;
  expiringIn7Days: number;
  membershipBreakdown: {
    active: number;
    activePercent: number;
    paused: number;
    pausedPercent: number;
    expiring: number;
    expiringPercent: number;
    expired: number;
    expiredPercent: number;
  };
  attendanceTrends: Array<{
    date: string;
    label: string;
    count: number;
  }>;
  retentionSummary: {
    lowCount: number;
    lowPercent: number;
    mediumCount: number;
    mediumPercent: number;
    highCount: number;
    highPercent: number;
    limitedCount: number;
    limitedPercent: number;
  };
  attentionQueue: AttentionQueueItem[];
};

export type PrototypeState = 'active' | 'empty' | 'loading' | 'partial' | 'error' | 'no_ml';
