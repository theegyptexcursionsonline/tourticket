import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

/**
 * Client report 2026-08-21: deleted destinations kept appearing on the live
 * site — "Explore More Destinations" listed trashed test records ("Test:
 * Pyramids"). Archiving sets `archivedAt` AND `isPublished: false`, so a
 * query filtering on either is safe; a query filtering on NEITHER leaks.
 */
describe('storefront destination reads exclude trashed records', () => {
  const detail = read('app/[locale]/destinations/[slug]/DestinationDetailContent.tsx');

  it('the related-destinations query filters trash (the reported leak)', () => {
    const related = detail.slice(detail.indexOf('relatedDestinationsRaw'), detail.indexOf('relatedDestinationsRaw') + 700);
    expect(related).toContain('PUBLIC_CONTENT_FILTER');
  });

  it('a trashed destination no longer serves its own page or metadata', () => {
    const queries = detail.match(/DestinationModel\.find\(\{[\s\S]{0,260}?\}\)/g) || [];
    expect(queries.length).toBeGreaterThanOrEqual(2);
    for (const query of queries) {
      expect(query).toMatch(/NOT_ARCHIVED_FILTER|PUBLIC_CONTENT_FILTER/);
    }
  });

  it('the category list is tenant-scoped and trash-filtered instead of find({})', () => {
    expect(detail).not.toMatch(/CategoryModel\.find\(\{\}\)/);
    const categories = detail.slice(detail.indexOf('CategoryModel.find('), detail.indexOf('CategoryModel.find(') + 220);
    expect(categories).toContain('PUBLIC_CONTENT_FILTER');
  });
});

describe('slug resolution cannot render or redirect to trash', () => {
  const resolver = read('lib/content/resolveContentBySlug.ts');

  it('every content lookup requires published, non-archived records at the source', () => {
    const lookups = resolver.match(/(Tour|Destination|Category|AttractionPage)\.findOne\(\{[^)]*?\}\)/g) || [];
    expect(lookups.length).toBe(4);
    for (const lookup of lookups) {
      expect(lookup).toContain('PUBLIC_CONTENT_FILTER');
    }
  });

  it('does not fall back to an unpublished match for render or redirect decisions', () => {
    expect(resolver).not.toMatch(/\|\|\s*matches\.find/);
    expect(resolver).not.toMatch(/matches\.find\(\(m\) => m\.isPublished\)\s*\|\|/);
  });
});

describe('blog links and sitemap do not surface trash', () => {
  it('blog populates filter the joined side', () => {
    for (const file of ['app/[locale]/blog/[slug]/page.tsx', 'app/[locale]/blog/page.tsx']) {
      const source = read(file);
      expect(source).toMatch(/relatedDestinations[\s\S]{0,160}PUBLIC_CONTENT_FILTER/);
      expect(source).toMatch(/relatedTours[\s\S]{0,140}PUBLIC_CONTENT_FILTER/);
    }
  });

  it('the sitemap destination query requires published and non-archived content', () => {
    const sitemap = read('app/sitemap.ts');
    const destinations = sitemap.slice(sitemap.indexOf("const Destination = requiredModel('Destination')"));
    expect(destinations).toContain('PUBLIC_CONTENT_FILTER');
  });
});

describe('Empty trash refuses to delete anything still in use', () => {
  const purge = read('lib/admin/emptyTrash.ts');
  const route = read('app/api/admin/trash/route.ts');

  it('only ever targets records that are already in the trash', () => {
    expect(purge).toContain("const TRASHED_FILTER = { archivedAt: { $ne: null } }");
    // Re-asserted in the delete query itself, so a restore mid-flight wins.
    const deleteCall = purge.slice(purge.indexOf('const removed = await model.findOneAndDelete'), purge.indexOf('const removed = await model.findOneAndDelete') + 220);
    expect(deleteCall).toContain('TRASHED_FILTER');
  });

  it('never deletes a tour that has bookings', () => {
    expect(purge).toContain('Booking.countDocuments({ tour: doc._id })');
    expect(purge).toMatch(/booking.*on record/);
  });

  it('never deletes a destination still linked to tours or blog posts', () => {
    expect(purge).toContain('Tour.countDocuments({ destination: doc._id })');
    expect(purge).toContain('Blog.countDocuments({ relatedDestinations: doc._id })');
  });

  it('never deletes a category still used by a tour', () => {
    expect(purge).toContain('Tour.countDocuments({ category: doc._id })');
  });

  it('deletes one by one so each model delete hook runs (search-index cleanup)', () => {
    expect(purge).toContain('await model.findOneAndDelete(');
    expect(purge).not.toContain('await model.deleteMany(');
  });

  it('is gated on permissions AND a super administrator', () => {
    expect(route).toContain("permissions: ['manageTours', 'manageContent']");
    expect(route).toContain("auth.role !== 'super_admin'");
  });

  it('audits the purge and revalidates the storefront', () => {
    expect(route).toContain('registerAdminAuditDetail');
    expect(route).toContain('revalidateStorefrontContent()');
  });
});
