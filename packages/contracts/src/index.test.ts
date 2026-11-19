import { describe, expect, it } from 'vitest';
import { memberCreateSchema } from './index.js';

describe('memberCreateSchema', () => {
  it('accepts required member data and rejects invalid email addresses', () => {
    expect(
      memberCreateSchema.parse({ firstName: 'Ada', lastName: 'Lovelace' }),
    ).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(
      memberCreateSchema.safeParse({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'invalid',
      }).success,
    ).toBe(false);
  });
});
