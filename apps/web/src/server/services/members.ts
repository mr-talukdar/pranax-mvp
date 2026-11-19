import 'server-only';

import { withVerifiedStudioContext } from '@pranax/database';
import type { StudioContext } from '../auth/context';
import type { MemberCreateInput } from '../validation/members';

const memberFields = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} as const;

export function listMembers(context: StudioContext) {
  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    (tx) => {
      return tx.member.findMany({
        where: { studioId: context.studioId },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: memberFields,
      });
    },
  );
}

export function createMember(context: StudioContext, input: MemberCreateInput) {
  return withVerifiedStudioContext(
    context.authUserId,
    context.studioId,
    (tx) => {
      return tx.member.create({
        data: { studioId: context.studioId, ...input },
        select: memberFields,
      });
    },
  );
}
