import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import type { Prisma } from '@pranax/database';
import {
  createMember,
  getMemberById,
  listMembers,
  updateMember,
} from './members';
import {
  DuplicateMemberEmailError,
  MemberNotFoundError,
} from './errors';

type MockMember = {
  id: string;
  studioId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  membershipPeriods: Array<{
    id: string;
    studioId: string;
    memberId: string;
    planId: string;
    startsAt: Date;
    originalEndsAt: Date;
    effectiveEndsAt: Date;
    status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';
    renewedFromId: string | null;
    cancelledAt: Date | null;
    createdAt: Date;
    plan: { name: string; durationDays: number; priceCents: number };
    pauses: Array<{
      id: string;
      startsAt: Date;
      resumesAt: Date | null;
      createdAt: Date;
    }>;
  }>;
};

let members: MockMember[];
let nextId: number;

function mockTx() {
  return {
    member: {
      count: async ({ where }: { where: Record<string, unknown> }) => {
        return members.filter((m) => {
          if (m.studioId !== where.studioId) return false;
          if (where.OR && Array.isArray(where.OR)) {
            const searchTerms = where.OR as Array<Record<string, { contains: string }>>;
            const term = searchTerms[0]?.firstName?.contains?.toLowerCase();
            if (term) {
              const matched =
                m.firstName.toLowerCase().includes(term) ||
                m.lastName.toLowerCase().includes(term) ||
                (m.email?.toLowerCase().includes(term) ?? false) ||
                (m.phone?.includes(term) ?? false);
              if (!matched) return false;
            }
          }
          if (where.membershipPeriods) {
            const periods = where.membershipPeriods as Record<string, unknown>;
            if (periods.some && (periods.some as Record<string, string>).status === 'ACTIVE') {
              return m.membershipPeriods.some((p) => p.status === 'ACTIVE');
            }
            if (periods.none && Object.keys(periods.none as object).length === 0) {
              return m.membershipPeriods.length === 0;
            }
          }
          return true;
        }).length;
      },
      findMany: async ({
        where,
        skip = 0,
        take = 50,
      }: {
        where: Record<string, unknown>;
        skip?: number;
        take?: number;
      }) => {
        return members
          .filter((m) => {
            if (m.studioId !== where.studioId) return false;
            if (where.OR && Array.isArray(where.OR)) {
              const searchTerms = where.OR as Array<Record<string, { contains: string }>>;
              const term = searchTerms[0]?.firstName?.contains?.toLowerCase();
              if (term) {
                const matched =
                  m.firstName.toLowerCase().includes(term) ||
                  m.lastName.toLowerCase().includes(term) ||
                  (m.email?.toLowerCase().includes(term) ?? false) ||
                  (m.phone?.includes(term) ?? false);
                if (!matched) return false;
              }
            }
            if (where.membershipPeriods) {
              const periods = where.membershipPeriods as Record<string, unknown>;
              if (periods.some && (periods.some as Record<string, string>).status === 'ACTIVE') {
                return m.membershipPeriods.some((p) => p.status === 'ACTIVE');
              }
              if (periods.none && Object.keys(periods.none as object).length === 0) {
                return m.membershipPeriods.length === 0;
              }
            }
            return true;
          })
          .slice(skip, skip + take);
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        return (
          members.find((m) => {
            if (where.studioId && m.studioId !== where.studioId) return false;
            if (where.id && m.id !== where.id) return false;
            if (where.id && typeof where.id === 'object' && 'not' in where.id) {
              if (m.id === (where.id as { not: string }).not) return false;
            }
            if (where.email && m.email !== where.email) return false;
            return true;
          }) ?? null
        );
      },
      create: async ({
        data,
      }: {
        data: Prisma.MemberUncheckedCreateInput;
      }) => {
        const id = `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`;
        const newMember: MockMember = {
          id,
          studioId: data.studioId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: (data.email as string) || null,
          phone: (data.phone as string) || null,
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          membershipPeriods: [],
        };
        members.push(newMember);
        return newMember;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id_studioId: { id: string; studioId: string } };
        data: Prisma.MemberUpdateInput;
      }) => {
        const member = members.find(
          (m) =>
            m.id === where.id_studioId.id &&
            m.studioId === where.id_studioId.studioId,
        );
        if (!member) throw new Error('Not found');
        if (data.firstName) member.firstName = data.firstName as string;
        if (data.lastName) member.lastName = data.lastName as string;
        if (data.email !== undefined) member.email = (data.email as string) || null;
        if (data.phone !== undefined) member.phone = (data.phone as string) || null;
        member.updatedAt = new Date();
        return member;
      },
    },
  };
}

vi.mock('@pranax/database', () => ({
  withVerifiedStudioContext: async (
    _authUserId: string,
    _studioId: string,
    operation: (tx: unknown) => Promise<unknown>,
  ) => {
    return operation(mockTx());
  },
}));

const studioAContext = {
  authUserId: 'user-a',
  studioId: '00000000-0000-4000-8000-000000000001',
};

const studioBContext = {
  authUserId: 'user-b',
  studioId: '00000000-0000-4000-8000-000000000002',
};

describe('F01: Member Management Service', () => {
  beforeEach(() => {
    members = [];
    nextId = 0;
  });

  it('registers a member with generated ID, studio association, and normalized fields', async () => {
    const member = await createMember(studioAContext, {
      firstName: '  Sarah ',
      lastName: ' Jenkins  ',
      email: 'SARAH.JENKINS@EXAMPLE.COM',
      phone: ' +91 98301 22341 ',
    });

    expect(member.id).toBeDefined();
    expect(member.firstName).toBe('Sarah');
    expect(member.lastName).toBe('Jenkins');
    expect(member.email).toBe('sarah.jenkins@example.com');
    expect(member.phone).toBe('+91 98301 22341');
    expect(member.currentMembership).toBeNull();
  });

  it('allows a member to exist without an active membership', async () => {
    const member = await createMember(studioAContext, {
      firstName: 'Maya',
      lastName: 'Patel',
    });
    expect(member.currentMembership).toBeNull();
  });

  it('prevents duplicate studio email registrations', async () => {
    await createMember(studioAContext, {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'duplicate@example.com',
    });

    await expect(
      createMember(studioAContext, {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'DUPLICATE@example.com',
      }),
    ).rejects.toThrow(DuplicateMemberEmailError);
  });

  it('allows the same email in a different studio (tenant isolation)', async () => {
    await createMember(studioAContext, {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'shared@example.com',
    });

    const memberB = await createMember(studioBContext, {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'shared@example.com',
    });

    expect(memberB).toBeDefined();
  });

  it('updates member details and preserves omitted fields', async () => {
    const created = await createMember(studioAContext, {
      firstName: 'Maya',
      lastName: 'Patel',
      email: 'maya@example.com',
      phone: '+91 99999 00000',
    });

    const updated = await updateMember(studioAContext, created.id, {
      lastName: 'Patel-Sen',
    });

    expect(updated.firstName).toBe('Maya');
    expect(updated.lastName).toBe('Patel-Sen');
    expect(updated.email).toBe('maya@example.com');
    expect(updated.phone).toBe('+91 99999 00000');
  });

  it('enforces tenant-scoped listing and search', async () => {
    await createMember(studioAContext, {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'sarah@example.com',
    });
    await createMember(studioAContext, {
      firstName: 'David',
      lastName: 'Miller',
      email: 'david@example.com',
    });
    await createMember(studioBContext, {
      firstName: 'Foreign',
      lastName: 'Member',
      email: 'foreign@example.com',
    });

    const listA = await listMembers(studioAContext, { search: 'Sarah' });
    expect(listA.data).toHaveLength(1);
    expect(listA.data[0].firstName).toBe('Sarah');
    expect(listA.pagination.total).toBe(1);

    const fullListA = await listMembers(studioAContext);
    expect(fullListA.data).toHaveLength(2);
    expect(fullListA.data.some((m) => m.firstName === 'Foreign')).toBe(false);
  });

  it('rejects cross-tenant member access or editing', async () => {
    const memberB = await createMember(studioBContext, {
      firstName: 'Tenant B Member',
      lastName: 'Secret',
      email: 'b@example.com',
    });

    const foundInA = await getMemberById(studioAContext, memberB.id);
    expect(foundInA).toBeNull();

    await expect(
      updateMember(studioAContext, memberB.id, { firstName: 'Hacked' }),
    ).rejects.toThrow(MemberNotFoundError);
  });
});
