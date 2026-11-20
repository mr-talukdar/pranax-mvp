export class ServiceError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class DuplicateMemberEmailError extends ServiceError {
  constructor(email: string) {
    super(`A member with email "${email}" already exists in this studio.`, 409, 'DUPLICATE_EMAIL');
    this.name = 'DuplicateMemberEmailError';
  }
}

export class MemberNotFoundError extends ServiceError {
  constructor(memberId: string) {
    super(`Member "${memberId}" was not found in the current studio.`, 404, 'MEMBER_NOT_FOUND');
    this.name = 'MemberNotFoundError';
  }
}

export class MembershipConflictError extends ServiceError {
  constructor(message: string) {
    super(message, 409, 'MEMBERSHIP_CONFLICT');
    this.name = 'MembershipConflictError';
  }
}

export class MembershipNotFoundError extends ServiceError {
  constructor(periodId: string) {
    super(`Membership period "${periodId}" was not found in the current studio.`, 404, 'MEMBERSHIP_NOT_FOUND');
    this.name = 'MembershipNotFoundError';
  }
}

export class InvalidMembershipStateError extends ServiceError {
  constructor(message: string) {
    super(message, 400, 'INVALID_MEMBERSHIP_STATE');
    this.name = 'InvalidMembershipStateError';
  }
}

export class AttendanceError extends ServiceError {
  constructor(message: string, statusCode = 400, code = 'ATTENDANCE_ERROR') {
    super(message, statusCode, code);
    this.name = 'AttendanceError';
  }
}
