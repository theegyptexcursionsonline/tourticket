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

export async function localizeParentPage<T extends ParentPageValue | null | undefined>(parentPage: T, locale: string): Promise<T> {
  if (!parentPage || !parentPage.slug || !locale || locale.startsWith('en')) return parentPage;
  const lookup = lookupFor(parentPage.kind);
  if (!lookup) return parentPage;
  try {
    await dbConnect();
    const doc = await lookup.model
      .findOne({ slug: parentPage.slug, ...DEFAULT_TENANT_FILTER })
      .select(`${lookup.field} translations`)
      .lean() as Record<string, unknown> | null;
    if (!doc) return parentPage;
    const localized = localizeEntityFields(doc, locale, [lookup.field]);
    const translated = localized[lookup.field];
    // Only a real translation replaces the label; an untranslated parent keeps the stored one.
    if (typeof translated !== 'string' || !translated.trim() || translated === doc[lookup.field]) return parentPage;
    return { ...parentPage, label: translated.trim() } as T;
  } catch {
    // A failed lookup only affects a breadcrumb label: keep the stored one.
    return parentPage;
  }
}
