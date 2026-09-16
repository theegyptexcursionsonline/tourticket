import {
  decryptTwoFactorSecretWithKey,
  deriveTwoFactorKey,
  encryptTwoFactorSecretWithKey,
} from '@/lib/auth/twoFactor';

jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { find: jest.fn(), updateOne: jest.fn() },
}));

import User from '@/lib/models/user';
import { rekeyTwoFactorSecrets } from '@/lib/auth/twoFactorRekey';

const OLD_KEY = 'old-two-factor-key-with-at-least-32-characters';
const NEW_KEY = 'new-two-factor-key-with-at-least-32-characters';
const oldKey = deriveTwoFactorKey(OLD_KEY);
const newKey = deriveTwoFactorKey(NEW_KEY);

const find = User.find as jest.Mock;
const updateOne = User.updateOne as jest.Mock;

function stubUsers(users: Array<Record<string, unknown>>) {
  find.mockReturnValue({
    select: () => ({
      lean: () => ({
        cursor: () => ({
          async *[Symbol.asyncIterator]() {
            for (const user of users) yield user;
          },
        }),
      }),
    }),
  });
}

describe('rekeyTwoFactorSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('re-encrypts every secret the current key opens so the new key opens it, keeping the plaintext', async () => {
    const active = encryptTwoFactorSecretWithKey('ACTIVESECRET', oldKey);
    const pending = encryptTwoFactorSecretWithKey('PENDINGSECRET', oldKey);
    stubUsers([{ _id: 'u1', twoFactorSecret: active, twoFactorPendingSecret: pending }]);

    const summary = await rekeyTwoFactorSecrets({ fromRawKey: OLD_KEY, toRawKey: NEW_KEY, dryRun: false });

    expect(summary).toMatchObject({ inspected: 1, rotated: 2, alreadyRotated: 0, undecryptable: 0, conflicted: 0 });
    expect(updateOne).toHaveBeenCalledTimes(2);
    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: 'u1', twoFactorSecret: active });
    expect(decryptTwoFactorSecretWithKey(update.$set.twoFactorSecret, newKey)).toBe('ACTIVESECRET');
    expect(() => decryptTwoFactorSecretWithKey(update.$set.twoFactorSecret, oldKey)).toThrow();
  });

  it('is idempotent: values the new key already opens are counted and never rewritten', async () => {
    stubUsers([{ _id: 'u1', twoFactorSecret: encryptTwoFactorSecretWithKey('DONE', newKey) }]);

    const summary = await rekeyTwoFactorSecrets({ fromRawKey: OLD_KEY, toRawKey: NEW_KEY, dryRun: false });

    expect(summary).toMatchObject({ rotated: 0, alreadyRotated: 1, undecryptable: 0 });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('reports, and never touches, a value that neither key opens', async () => {
    const foreign = encryptTwoFactorSecretWithKey('X', deriveTwoFactorKey('some-other-key-that-is-long-enough-000000'));
    stubUsers([{ _id: 'u9', twoFactorSecret: foreign }]);

    const summary = await rekeyTwoFactorSecrets({ fromRawKey: OLD_KEY, toRawKey: NEW_KEY, dryRun: false });

    expect(summary).toMatchObject({ rotated: 0, undecryptable: 1, undecryptableIds: ['u9'] });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('a dry run counts the work without writing', async () => {
    stubUsers([{ _id: 'u1', twoFactorSecret: encryptTwoFactorSecretWithKey('A', oldKey) }]);

    const summary = await rekeyTwoFactorSecrets({ fromRawKey: OLD_KEY, toRawKey: NEW_KEY, dryRun: true });

    expect(summary).toMatchObject({ dryRun: true, rotated: 1 });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('counts a compare-and-set that matched nothing as a conflict instead of a rotation', async () => {
    stubUsers([{ _id: 'u1', twoFactorSecret: encryptTwoFactorSecretWithKey('A', oldKey) }]);
    updateOne.mockResolvedValue({ modifiedCount: 0 });

    const summary = await rekeyTwoFactorSecrets({ fromRawKey: OLD_KEY, toRawKey: NEW_KEY, dryRun: false });

    expect(summary).toMatchObject({ rotated: 0, conflicted: 1 });
  });

  it('refuses short keys and an unchanged key', async () => {
    await expect(rekeyTwoFactorSecrets({ fromRawKey: 'short', toRawKey: NEW_KEY, dryRun: true })).rejects.toThrow('32');
    await expect(rekeyTwoFactorSecrets({ fromRawKey: OLD_KEY, toRawKey: OLD_KEY, dryRun: true })).rejects.toThrow('differ');
    expect(find).not.toHaveBeenCalled();
  });
});
