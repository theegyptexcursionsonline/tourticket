import User from '@/lib/models/user';
import {
  TWO_FACTOR_KEY_MIN_LENGTH,
  decryptTwoFactorSecretWithKey,
  deriveTwoFactorKey,
  encryptTwoFactorSecretWithKey,
} from '@/lib/auth/twoFactor';

const SECRET_FIELDS = ['twoFactorSecret', 'twoFactorPendingSecret'] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

export interface RekeySummary {
  dryRun: boolean;
  inspected: number;
  rotated: number;
  alreadyRotated: number;
  undecryptable: number;
  conflicted: number;
  /** Account ids (never emails or secrets) whose stored value neither key can open. */
  undecryptableIds: string[];
}

interface RekeyUser {
  _id: unknown;
  twoFactorSecret?: string;
  twoFactorPendingSecret?: string;
}

function canOpen(value: string, key: Buffer): boolean {
  try {
    decryptTwoFactorSecretWithKey(value, key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-encrypts every stored authenticator secret from one configured key to another.
 *
 * Runs wherever the current key is available, so the plaintext secret never leaves the process
 * that could already read it. Each write is a compare-and-set on the exact ciphertext it read, so a
 * concurrent enrolment or reset is never overwritten. Safe to re-run: values the new key already
 * opens are counted and left alone, and values neither key opens are reported, never touched.
 */
export async function rekeyTwoFactorSecrets(options: {
  fromRawKey: string;
  toRawKey: string;
  dryRun: boolean;
}): Promise<RekeySummary> {
  if (options.fromRawKey.length < TWO_FACTOR_KEY_MIN_LENGTH || options.toRawKey.length < TWO_FACTOR_KEY_MIN_LENGTH) {
    throw new Error('Both two-factor keys must have at least 32 characters.');
  }
  if (options.fromRawKey === options.toRawKey) {
    throw new Error('The next two-factor key must differ from the current one.');
  }
  const fromKey = deriveTwoFactorKey(options.fromRawKey);
  const toKey = deriveTwoFactorKey(options.toRawKey);
  const summary: RekeySummary = {
    dryRun: options.dryRun,
    inspected: 0,
    rotated: 0,
    alreadyRotated: 0,
    undecryptable: 0,
    conflicted: 0,
    undecryptableIds: [],
  };

  const cursor = User.find({
    $or: SECRET_FIELDS.map((field) => ({ [field]: { $type: 'string', $ne: '' } })),
  })
    .select(SECRET_FIELDS.map((field) => `+${field}`).join(' '))
    .lean<RekeyUser>()
    .cursor();

  for await (const user of cursor) {
    summary.inspected += 1;
    for (const field of SECRET_FIELDS) {
      const current = user[field as SecretField];
      if (!current) continue;

      if (canOpen(current, toKey)) {
        summary.alreadyRotated += 1;
        continue;
      }

      let plaintext: string;
      try {
        plaintext = decryptTwoFactorSecretWithKey(current, fromKey);
      } catch {
        summary.undecryptable += 1;
        summary.undecryptableIds.push(String(user._id));
        continue;
      }

      if (options.dryRun) {
        summary.rotated += 1;
        continue;
      }

      const result = await User.updateOne(
        { _id: user._id, [field]: current },
        { $set: { [field]: encryptTwoFactorSecretWithKey(plaintext, toKey) } },
      );
      if (result.modifiedCount === 1) summary.rotated += 1;
      else summary.conflicted += 1;
    }
  }

  return summary;
}
