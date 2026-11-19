import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('database foundation', () => {
  it('contains the required operational models and tenant migration controls', () => {
    const schema = readFileSync(
      new URL('../prisma/schema.prisma', import.meta.url),
      'utf8',
    );
    const migration = readFileSync(
      new URL(
        '../prisma/migrations/0001_foundation/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );

    for (const model of [
      'Studio',
      'StudioUser',
      'Member',
      'MembershipPeriod',
      'AttendanceRecord',
      'RetentionSnapshot',
      'ChurnPrediction',
      'AuditLog',
    ]) {
      expect(schema).toContain(`model ${model}`);
    }
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('MembershipPeriod_one_current_per_member');
    expect(schema).not.toContain('STAFF');
    expect(migration).toContain('auth.uid()');
    expect(migration).toContain('RetentionSnapshot_immutable');
    expect(migration).toContain('RetentionSnapshot_score_check');
    expect(migration).toContain('featureSnapshotAt');
  });
});
