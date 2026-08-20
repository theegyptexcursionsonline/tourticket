import mongoose from 'mongoose';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import Booking from '@/lib/models/Booking';
import Blog from '@/lib/models/Blog';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

/**
 * Permanent removal of trashed content ("Empty trash", client request
 * 2026-08-21). Deleting is irreversible, so this layer decides per record
 * whether removal is SAFE and reports the ones it refuses instead of
 * cascading through live references.
 *
 * Rules (each derived from a real reference in this database):
 * - Only records already in the trash (`archivedAt` set) can be purged.
 * - A tour with ANY booking is never deleted: `Booking.tour` is a hard ref
 *   and the Stripe webhook re-reads tours by id when payment settles.
 * - A destination still referenced by a tour, or linked from a blog post,
 *   is refused — the operator must move those first.
 * - A category still used by a tour is refused for the same reason.
 */
export type TrashKind = 'tour' | 'destination' | 'category' | 'page';

export type TrashPurgeVerdict = {
  id: string;
  title: string;
  deletable: boolean;
  /** Present when the record cannot be purged; customer-of-the-admin wording. */
  blockedReason?: string;
};

export type TrashPurgeReport = {
  kind: TrashKind;
  deleted: string[];
  blocked: TrashPurgeVerdict[];
  inspected: number;
};

const TRASHED_FILTER = { archivedAt: { $ne: null } };

const titleOf = (doc: Record<string, unknown>): string =>
  String(doc.title || doc.name || doc.slug || doc._id);

async function inspectTour(doc: Record<string, unknown>): Promise<TrashPurgeVerdict> {
  const id = String(doc._id);
  const bookings = await Booking.countDocuments({ tour: doc._id });
  return bookings > 0
    ? { id, title: titleOf(doc), deletable: false, blockedReason: `Has ${bookings} booking${bookings === 1 ? '' : 's'} on record` }
    : { id, title: titleOf(doc), deletable: true };
}

async function inspectDestination(doc: Record<string, unknown>): Promise<TrashPurgeVerdict> {
  const id = String(doc._id);
  const [tours, blogs] = await Promise.all([
    Tour.countDocuments({ destination: doc._id }),
    Blog.countDocuments({ relatedDestinations: doc._id }),
  ]);
  if (tours > 0) {
    return { id, title: titleOf(doc), deletable: false, blockedReason: `Still linked to ${tours} tour${tours === 1 ? '' : 's'}` };
  }
  if (blogs > 0) {
    return { id, title: titleOf(doc), deletable: false, blockedReason: `Linked from ${blogs} blog post${blogs === 1 ? '' : 's'}` };
  }
  return { id, title: titleOf(doc), deletable: true };
}

async function inspectCategory(doc: Record<string, unknown>): Promise<TrashPurgeVerdict> {
  const id = String(doc._id);
  const tours = await Tour.countDocuments({ category: doc._id });
  return tours > 0
    ? { id, title: titleOf(doc), deletable: false, blockedReason: `Still used by ${tours} tour${tours === 1 ? '' : 's'}` }
    : { id, title: titleOf(doc), deletable: true };
}

const MODELS = {
  tour: Tour,
  destination: Destination,
  category: Category,
  page: AttractionPage,
} as const;

const INSPECTORS: Record<TrashKind, (doc: Record<string, unknown>) => Promise<TrashPurgeVerdict>> = {
  tour: inspectTour,
  destination: inspectDestination,
  category: inspectCategory,
  // A content page owns no other record; being in the trash is enough.
  page: async (doc) => ({ id: String(doc._id), title: titleOf(doc), deletable: true }),
};

/** Read-only preview: what an Empty trash would delete, and what it would refuse. */
export async function inspectTrash(kind: TrashKind, ids?: string[]): Promise<TrashPurgeReport> {
  const model = MODELS[kind] as unknown as mongoose.Model<Record<string, unknown>>;
  const query: Record<string, unknown> = { ...DEFAULT_TENANT_FILTER, ...TRASHED_FILTER };
  if (ids?.length) {
    query._id = { $in: ids.filter((id) => mongoose.Types.ObjectId.isValid(id)) };
  }
  const docs = await model.find(query).select('_id title name slug').lean();
  const verdicts = await Promise.all(docs.map((doc) => INSPECTORS[kind](doc as Record<string, unknown>)));
  return {
    kind,
    inspected: verdicts.length,
    deleted: [],
    blocked: verdicts.filter((verdict) => !verdict.deletable),
  };
}

/**
 * Permanently deletes the safe trashed records and reports the refused ones.
 * Deletion re-asserts the trashed + tenant filter in the delete query itself,
 * so a record restored between inspection and deletion is not removed.
 */
export async function emptyTrash(kind: TrashKind, ids?: string[]): Promise<TrashPurgeReport> {
  const preview = await inspectTrash(kind, ids);
  const model = MODELS[kind] as unknown as mongoose.Model<Record<string, unknown>>;
  const query: Record<string, unknown> = { ...DEFAULT_TENANT_FILTER, ...TRASHED_FILTER };
  if (ids?.length) {
    query._id = { $in: ids.filter((id) => mongoose.Types.ObjectId.isValid(id)) };
  }
  const docs = await model.find(query).select('_id title name slug').lean();
  const blockedIds = new Set(preview.blocked.map((verdict) => verdict.id));

  const deleted: string[] = [];
  for (const doc of docs) {
    const id = String((doc as Record<string, unknown>)._id);
    if (blockedIds.has(id)) continue;
    // findOneAndDelete (not deleteMany) so each model's own delete hooks run —
    // that is what removes the record from the search index.
    const removed = await model.findOneAndDelete({
      _id: id,
      ...DEFAULT_TENANT_FILTER,
      ...TRASHED_FILTER,
    });
    if (removed) deleted.push(id);
  }

  return { ...preview, deleted };
}
