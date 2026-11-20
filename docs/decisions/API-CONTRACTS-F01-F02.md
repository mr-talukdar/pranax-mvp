# PranaX Operations Backend API Contracts (F01 Member Management + F02 Attendance Tracking)

## Architectural & Security Foundation
All operations are scoped to a verified tenant studio session via `withVerifiedStudioContext`.
Tenant isolation is enforced by PostgreSQL Row-Level Security (RLS) policies and transaction-local `app.studio_id` / `request.jwt.claim.sub`. Clients cannot supply arbitrary `studioId` values; identity and tenant membership are strictly resolved on the server.

---

## 1. Member Management (F01)

### 1.1 List Members
- **Endpoint**: `GET /api/members`
- **Query Parameters**:
  - `search` (string, optional): Case-insensitive search on first name, last name, email, or phone.
  - `status` (enum: `ACTIVE`, `PAUSED`, `EXPIRED`, `CANCELLED`, `NO_MEMBERSHIP`, optional): Filter by current membership status.
  - `limit` (integer, optional, default: 50, max: 100): Pagination size.
  - `offset` (integer, optional, default: 0): Pagination offset.
  - `sort` (enum: `name_asc`, `name_desc`, `joined_desc`, optional, default: `name_asc`): Stable ordering.
- **Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "00000000-0000-4000-8000-000000000001",
      "firstName": "Sarah",
      "lastName": "Jenkins",
      "email": "sarah.jenkins@example.com",
      "phone": "+91 98301 22341",
      "joinedAt": "2025-08-12T00:00:00.000Z",
      "createdAt": "2025-08-12T00:00:00.000Z",
      "updatedAt": "2025-08-12T00:00:00.000Z",
      "currentMembership": {
        "id": "00000000-0000-4000-8000-000000000002",
        "planId": "00000000-0000-4000-8000-000000000003",
        "planName": "Monthly",
        "status": "ACTIVE",
        "startsAt": "2026-06-01",
        "effectiveEndsAt": "2026-06-30"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```
- **Errors**: 401 Unauthorized (missing studio context), 500 Internal Error.

---

### 1.2 Register Member
- **Endpoint**: `POST /api/members`
- **Request Body**:
```json
{
  "firstName": "Maya",
  "lastName": "Patel",
  "email": "maya.patel@example.com",
  "phone": "+91 98310 44512"
}
```
- **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000001",
    "firstName": "Maya",
    "lastName": "Patel",
    "email": "maya.patel@example.com",
    "phone": "+91 98310 44512",
    "joinedAt": "2026-11-20T14:00:00.000Z",
    "createdAt": "2026-11-20T14:00:00.000Z",
    "updatedAt": "2026-11-20T14:00:00.000Z"
  }
}
```
- **Errors**:
  - 400 Bad Request: Zod validation failure (`firstName` or `lastName` empty).
  - 409 Conflict: A member with this email already exists in this studio.

---

### 1.3 Get Member Profile
- **Endpoint**: `GET /api/members/:memberId`
- **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000001",
    "firstName": "Maya",
    "lastName": "Patel",
    "email": "maya.patel@example.com",
    "phone": "+91 98310 44512",
    "joinedAt": "2026-11-20T14:00:00.000Z",
    "createdAt": "2026-11-20T14:00:00.000Z",
    "updatedAt": "2026-11-20T14:00:00.000Z",
    "currentMembership": {
      "id": "00000000-0000-4000-8000-000000000002",
      "planId": "00000000-0000-4000-8000-000000000003",
      "planName": "Monthly",
      "status": "ACTIVE",
      "startsAt": "2026-06-01",
      "originalEndsAt": "2026-06-30",
      "effectiveEndsAt": "2026-06-30",
      "pauses": []
    },
    "metrics": {
      "totalAttendanceDays": 12,
      "lastAttendanceDate": "2026-06-24",
      "attendanceLast7Days": 2,
      "attendanceLast30Days": 8,
      "weeklyAverageFrequency": 2.0,
      "changeConsecutive30Days": {
        "recent": 8,
        "previous": 4,
        "absoluteChange": 4,
        "percentageDecline": 0
      },
      "daysSinceLastVisit": 1,
      "coverageStatus": "VERIFIED"
    }
  }
}
```
- **Errors**: 404 Not Found (member does not exist or belongs to another studio).

---

### 1.4 Update Member Profile
- **Endpoint**: `PATCH /api/members/:memberId`
- **Request Body**:
```json
{
  "firstName": "Maya",
  "lastName": "Patel-Sen",
  "email": "maya.sen@example.com",
  "phone": "+91 98310 44512"
}
```
- **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000001",
    "firstName": "Maya",
    "lastName": "Patel-Sen",
    "email": "maya.sen@example.com",
    "phone": "+91 98310 44512",
    "joinedAt": "2026-11-20T14:00:00.000Z",
    "createdAt": "2026-11-20T14:00:00.000Z",
    "updatedAt": "2026-11-20T14:30:00.000Z"
  }
}
```
- **Errors**:
  - 400 Bad Request: Invalid input format.
  - 404 Not Found: Member not found in studio.
  - 409 Conflict: Duplicate email in this studio.

---

## 2. Membership Lifecycle (F01)

### 2.1 Get Membership History
- **Endpoint**: `GET /api/members/:memberId/memberships`
- **Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "00000000-0000-4000-8000-000000000002",
      "planId": "00000000-0000-4000-8000-000000000003",
      "planName": "Monthly",
      "startsAt": "2026-06-01",
      "originalEndsAt": "2026-06-30",
      "effectiveEndsAt": "2026-07-05",
      "status": "ACTIVE",
      "renewedFromId": null,
      "cancelledAt": null,
      "pauses": [
        {
          "id": "00000000-0000-4000-8000-000000000004",
          "startsAt": "2026-06-10",
          "resumesAt": "2026-06-15",
          "durationDays": 5
        }
      ]
    }
  ]
}
```

---

### 2.2 Create / Assign Membership
- **Endpoint**: `POST /api/members/:memberId/memberships`
- **Request Body**:
```json
{
  "planType": "MONTHLY",
  "planId": "optional-custom-plan-id",
  "startsAt": "2026-06-01"
}
```
*(Default plan types: `MONTHLY` (30 days), `QUARTERLY` (90 days), `ANNUAL` (365 days))*
- **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000002",
    "memberId": "00000000-0000-4000-8000-000000000001",
    "planId": "00000000-0000-4000-8000-000000000003",
    "planName": "Monthly",
    "startsAt": "2026-06-01",
    "originalEndsAt": "2026-06-30",
    "effectiveEndsAt": "2026-06-30",
    "status": "ACTIVE",
    "renewedFromId": null,
    "cancelledAt": null
  }
}
```
- **Errors**:
  - 400 Bad Request: Invalid plan or date.
  - 409 Conflict: Member already has an active or paused membership period.

---

### 2.3 Renew Membership
- **Endpoint**: `POST /api/members/:memberId/memberships/:periodId/renew`
- **Request Body**:
```json
{
  "planType": "MONTHLY",
  "planId": "optional-custom-plan-id"
}
```
- **Success Response (201 Created)**:
```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000005",
    "memberId": "00000000-0000-4000-8000-000000000001",
    "planId": "00000000-0000-4000-8000-000000000003",
    "planName": "Monthly",
    "startsAt": "2026-07-01",
    "originalEndsAt": "2026-07-30",
    "effectiveEndsAt": "2026-07-30",
    "status": "ACTIVE",
    "renewedFromId": "00000000-0000-4000-8000-000000000002"
  }
}
```
- **Business Logic**:
  - Previous period transitions to `EXPIRED` status with historical dates intact.
  - New period links via `renewedFromId`.
  - Non-overlapping active membership guarantees preserved.

---

### 2.4 Pause Membership
- **Endpoint**: `POST /api/members/:memberId/memberships/:periodId/pause`
- **Request Body**:
```json
{
  "startsAt": "2026-06-10"
}
```
- **Success Response (200 OK)**:
```json
{
  "data": {
    "period": {
      "id": "00000000-0000-4000-8000-000000000002",
      "status": "PAUSED",
      "effectiveEndsAt": "2026-06-30"
    },
    "pause": {
      "id": "00000000-0000-4000-8000-000000000004",
      "startsAt": "2026-06-10",
      "resumesAt": null
    }
  }
}
```
- **Errors**:
  - 400 Bad Request: Membership is not in `ACTIVE` status or pause date is invalid.
  - 409 Conflict: An open pause already exists for this period.

---

### 2.5 Resume Membership
- **Endpoint**: `POST /api/members/:memberId/memberships/:periodId/resume`
- **Request Body**:
```json
{
  "resumesAt": "2026-06-15"
}
```
- **Success Response (200 OK)**:
```json
{
  "data": {
    "period": {
      "id": "00000000-0000-4000-8000-000000000002",
      "status": "ACTIVE",
      "effectiveEndsAt": "2026-07-05"
    },
    "pause": {
      "id": "00000000-0000-4000-8000-000000000004",
      "startsAt": "2026-06-10",
      "resumesAt": "2026-06-15"
    },
    "extendedDays": 5
  }
}
```
- **Business Logic**:
  - `effectiveEndsAt` is extended by the paused duration (`resumesAt - startsAt`).
  - Period status returns to `ACTIVE`.

---

### 2.6 Cancel Membership
- **Endpoint**: `POST /api/members/:memberId/memberships/:periodId/cancel`
- **Request Body**:
```json
{
  "effectiveDate": "2026-06-20",
  "reason": "Relocating to another city"
}
```
- **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000002",
    "status": "CANCELLED",
    "cancelledAt": "2026-06-20T10:00:00.000Z",
    "effectiveEndsAt": "2026-06-20"
  }
}
```

---

## 3. Attendance Tracking (F02)

### 3.1 Manual Check-In
- **Endpoint**: `POST /api/attendance/check-in`
- **Request Body**:
```json
{
  "memberId": "00000000-0000-4000-8000-000000000001",
  "occurredAt": "2026-11-20T09:30:00.000Z"
}
```
- **Success Response (200 / 201 Created)**:
```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000010",
    "memberId": "00000000-0000-4000-8000-000000000001",
    "memberName": "Maya Patel",
    "localDate": "2026-11-20",
    "occurredAt": "2026-11-20T09:30:00.000Z",
    "source": "MANUAL",
    "alreadyCheckedIn": false,
    "membershipWarning": null
  }
}
```
*(If already checked in today, returns HTTP 200 with `alreadyCheckedIn: true` and the existing record).*
*(If membership is `EXPIRED`, `PAUSED`, `CANCELLED` or missing, returns HTTP 200/201 with `membershipWarning: { status: "EXPIRED", message: "Member has an expired membership" }` and successfully commits check-in).*

---

### 3.2 List Studio Attendance
- **Endpoint**: `GET /api/attendance`
- **Query Parameters**:
  - `memberId` (uuid, optional)
  - `startDate` (YYYY-MM-DD, optional)
  - `endDate` (YYYY-MM-DD, optional)
  - `source` (MANUAL | CSV, optional)
  - `limit` (int, default: 50)
  - `offset` (int, default: 0)
- **Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "00000000-0000-4000-8000-000000000010",
      "memberId": "00000000-0000-4000-8000-000000000001",
      "memberName": "Maya Patel",
      "memberEmail": "maya.patel@example.com",
      "localDate": "2026-11-20",
      "occurredAt": "2026-11-20T09:30:00.000Z",
      "source": "MANUAL"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### 3.3 List Member Attendance History & Engagement
- **Endpoint**: `GET /api/members/:memberId/attendance`
- **Query Parameters**:
  - `startDate`, `endDate`, `source`, `limit`, `offset`
- **Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "00000000-0000-4000-8000-000000000010",
      "localDate": "2026-11-20",
      "occurredAt": "2026-11-20T09:30:00.000Z",
      "source": "MANUAL"
    }
  ],
  "pagination": { "total": 1, "limit": 50, "offset": 0, "hasMore": false },
  "metrics": {
    "totalAttendanceDays": 12,
    "lastAttendanceDate": "2026-11-20",
    "attendanceLast7Days": 2,
    "attendanceLast30Days": 8,
    "weeklyAverageFrequency": 2.0,
    "changeConsecutive30Days": {
      "recent": 8,
      "previous": 4,
      "absoluteChange": 4,
      "percentageDecline": 0
    },
    "daysSinceLastVisit": 0,
    "coverageStatus": "VERIFIED"
  }
}
```

---

### 3.4 CSV Attendance Import
- **Endpoint**: `POST /api/attendance/import`
- **Request Format**: `multipart/form-data` with `file: <csv>` OR `application/json` with:
```json
{
  "csvContent": "member_id,email,phone,attendance_timestamp\n,maya.patel@example.com,,2026-06-25T09:30:00Z\n",
  "sourceName": "mindbody_export.csv",
  "idempotencyKey": "mb-20260625-01"
}
```
- **Validation Rules**:
  - Headers accepted: `member_id`, `email`, `phone`, `attendance_timestamp` (or `checkedInAt`, `date`).
  - At least one member identifier must be present.
  - Multi-identifier conflicts or unknown members are rejected at row level.
  - Duplicate same-day attendances are deduplicated idempotently.
  - Batch size limits: Max 5MB file, max 2,000 rows.
- **Success Response (200 OK / 201 Created)**:
```json
{
  "data": {
    "batchId": "00000000-0000-4000-8000-000000000099",
    "sourceName": "mindbody_export.csv",
    "totalRows": 4,
    "importedRows": 3,
    "duplicateRows": 0,
    "rejectedRows": 1,
    "errors": [
      {
        "row": 4,
        "identifier": "unknown.guest@mail.com",
        "error": "Member not found in current studio"
      }
    ]
  }
}
```

---

### 3.5 Get Batch Details
- **Endpoint**: `GET /api/attendance/import/:batchId`
- **Success Response (200 OK)**:
```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000099",
    "sourceName": "mindbody_export.csv",
    "idempotencyKey": "mb-20260625-01",
    "importedAt": "2026-11-20T14:30:00.000Z",
    "rowCount": 3
  }
}
```

---

## 4. Retention Intelligence Integration (F03)
When attendance is recorded (manual or CSV) or membership status changes (created, renewed, paused, resumed, cancelled):
- Asynchronous non-blocking recalculation hook `triggerMemberRetentionReassessment(context, memberId)` is executed.
- If the Python intelligence service is temporarily unavailable or returns an error, the operation logs a warning and completes without rolling back the primary database transaction.
- Eligible complete assessments are persisted idempotently according to snapshot change threshold rules (ADR-003).
- Passive temporal events (e.g. membership expiration passing midnight) require a daily scheduled job.
