// The breadcrumb parent of a page is stored as a snapshot ({ slug, label, kind })
// whose label is the parent's English title. On other languages the crumb read
// "Luxor Attractions" in the middle of an Arabic page. Look the parent up and use
// its own translation when it has one; otherwise keep the stored label.
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import type { ParentPageValue } from '@/lib/content/contentNavigation';

type ParentLookup = { model: { findOne: (filter: Record<string, unknown>) => { select: (fields: string) => { lean: () => Promise<unknown> } } }; field: 'title' | 'name' };

function lookupFor(kind: ParentPageValue['kind']): ParentLookup | null {
  if (kind === 'attraction' || kind === 'category-2') return { model: AttractionPage as unknown as ParentLookup['model'], field: 'title' };
  if (kind === 'category') return { model: Category as unknown as ParentLookup['model'], field: 'name' };
  if (kind === 'destination') return { model: Destination as unknown as ParentLookup['model'], field: 'name' };
  return null;
}

type ParentDoc = Record<string, unknown> | null;

async function readParentDoc(kind: ParentPageValue['kind'], slug: string): Promise<ParentDoc> {
  const lookup = lookupFor(kind);
  if (!lookup) return null;
  try {
    await dbConnect();
    return await lookup.model
      .findOne({ slug, ...DEFAULT_TENANT_FILTER })
      .select(`${lookup.field} translations`)
      .lean() as ParentDoc;
  } catch {
    // A failed lookup only affects a breadcrumb label: keep the stored one.
    return null;
  }
}

/**
 * Start reading the parent at the same moment as the page itself, using the
 * parent slug the address already carries (/luxor-attractions/karnak-...).
 * The breadcrumb then costs no extra wait after the page read. Parents of
 * pages are pages, so the guess is a page; any other parent is read after.
 */
export interface ParentPrefetch {
  slug: string;
  kind: ParentPageValue['kind'];
  doc: Promise<ParentDoc>;
}

export function prefetchParentPage(parentSlug: string | null | undefined, locale: string): ParentPrefetch | undefined {
  const slug = parentSlug?.trim();
  if (!slug || !locale || locale.startsWith('en')) return undefined;
  return { slug, kind: 'attraction', doc: readParentDoc('attraction', slug) };
}

export async function localizeParentPage<T extends ParentPageValue | null | undefined>(
  parentPage: T,
  locale: string,
  prefetched?: ParentPrefetch,
): Promise<T> {
  if (!parentPage || !parentPage.slug || !locale || locale.startsWith('en')) return parentPage;
  const lookup = lookupFor(parentPage.kind);
  if (!lookup) return parentPage;
  // Use the early read only when it was for this exact parent and model.
  const samePage = prefetched
    && prefetched.slug === parentPage.slug
    && lookupFor(prefetched.kind)?.model === lookup.model;
  const doc = samePage ? await prefetched!.doc : await readParentDoc(parentPage.kind, parentPage.slug);
  if (!doc) return parentPage;
  const localized = localizeEntityFields(doc, locale, [lookup.field]);
  const translated = localized[lookup.field];
  // Only a real translation replaces the label; an untranslated parent keeps the stored one.
  if (typeof translated !== 'string' || !translated.trim() || translated === doc[lookup.field]) return parentPage;
  return { ...parentPage, label: translated.trim() } as T;
}
