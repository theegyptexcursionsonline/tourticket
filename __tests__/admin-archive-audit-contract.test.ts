import fs from 'node:fs';
import path from 'node:path';
import { auditStamp } from '@/lib/admin/auditStamp';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('archived is its own status, not a draft', () => {
  const list = read('app/admin/tours/ToursListClient.tsx');

  it('offers a client-facing Trash tab', () => {
    expect(list).toContain("id: 'archived' as TabFilter");
    expect(list).toContain("label: 'Trash'");
    expect(list).toContain("'all' | 'published' | 'draft' | 'featured' | 'archived'");
  });

  it('keeps archived tours out of every other tab, including Draft', () => {
    expect(list).toContain('list = list.filter((t) => !isArchived(t))');
  });

  it('derives the status instead of storing an enum, so nothing needs migrating', () => {
    expect(list).toContain('const isArchived = (tour: TourType) => Boolean(tour.archivedAt)');
  });

  it('ships archivedAt to the client so the tab can filter on it', () => {
    expect(read('app/api/admin/tours/route.ts')).toContain("'archivedAt'");
  });

  it('can restore to draft without forcing a publish', () => {
    expect(read('app/api/admin/tours/[id]/route.ts')).toContain('body.restoreFromArchive === true');
    expect(read('app/admin/tours/TourActions.tsx')).toContain('Restore to Draft');
  });
});

describe('audit trail records who touched a tour', () => {
  it('stamps a snapshot that survives the team member being removed', () => {
    expect(auditStamp({ id: 'u1', name: 'Sara', email: 'sara@example.com' }))
      .toEqual({ id: 'u1', name: 'Sara', email: 'sara@example.com' });
  });

  it('falls back to the email when no name is set', () => {
    expect(auditStamp({ id: 'u1', email: 'ops@example.com' })?.name).toBe('ops@example.com');
  });

  it('never stamps an actor without an id', () => {
    expect(auditStamp({ email: 'nobody@example.com' })).toBeUndefined();
    expect(auditStamp(null)).toBeUndefined();
    expect(auditStamp(undefined)).toBeUndefined();
  });

  it('sets createdBy on create and updatedBy on edit', () => {
    expect(read('app/api/admin/tours/route.ts')).toContain('body.createdBy = author');
    const edit = read('app/api/admin/tours/[id]/route.ts');
    expect(edit).toContain('body.updatedBy = editor');
    // a client cannot rewrite authorship
    expect(edit).toContain('delete body.createdBy');
  });

  it('exposes an editor filter on the tours list', () => {
    const list = read('app/admin/tours/ToursListClient.tsx');
    expect(list).toContain('editorFilter');
    expect(list).toContain("params.set('editor', editorFilter)");
  });
});

describe('hero images can be reordered safely', () => {
  const route = read('app/api/admin/hero-settings/images/reorder/route.ts');

  it('reorders by image URL, never by array index', () => {
    expect(route).toContain('order must be an array of image URLs');
    expect(route).toContain('byUrl');
  });

  it('refuses a stale order rather than scrambling the gallery', () => {
    expect(route).toContain('status: 409');
    expect(route).toContain('The gallery changed since this page was loaded');
  });

  it('persists immediately so index-addressed delete/activate stay correct', () => {
    const page = read('app/admin/hero-settings/page.tsx');
    expect(page).toContain("fetch('/api/admin/hero-settings/images/reorder'");
    expect(page).toContain('handleMoveImage');
  });
});

describe('pages and destinations can be archived from the row', () => {
  const list = read('app/admin/pages/page.tsx');

  it('offers archive and restore actions without opening the page', () => {
    expect(list).toContain('setArchived(row, true)');
    expect(list).toContain('setArchived(row, false)');
  });

  it('filters archived rows in the database query, not in the browser', () => {
    // client-side filtering would silently drop rows past the cursor
    const route = read('app/api/admin/pages/route.ts');
    expect(route).toContain("status === 'archived'");
    expect(route).toContain('attractionFilter.archivedAt = null');
    expect(route).toContain('categoryFilter.archivedAt = null');
  });

  it('stores the archive timestamp on both page models', () => {
    expect(read('lib/models/AttractionPage.ts')).toContain('archivedAt');
    expect(read('lib/models/Category.ts')).toContain('archivedAt');
  });

  it('moves pages to Trash through soft updates rather than hard deletion', () => {
    for (const route of [
      'app/api/admin/attraction-pages/[id]/route.ts',
      'app/api/categories/[id]/route.ts',
    ]) {
      const source = read(route);
      expect(source).toContain('$set: { isPublished: false, archivedAt: new Date() }');
      expect(source).not.toContain('findOneAndDelete({');
    }
    expect(list).toContain('<option value="archived">Trash</option>');
    expect(list).toContain('Restore from Trash');
  });

  it('gives destinations a tenant-scoped recoverable lifecycle without unlinking tours', () => {
    const route = read('app/api/admin/destinations/[id]/route.ts');
    const manager = read('app/admin/destinations/DestinationManager.tsx');
    expect(read('lib/models/Destination.ts')).toContain('archivedAt: { type: Date');
    expect(route).toContain('restoreFromTrash');
    expect(route).toContain('Linked tours were preserved');
    expect(route).not.toContain('Tour.updateMany');
    expect(route).not.toContain('Destination.findOneAndDelete');
    expect(manager).toContain("listView === 'trash'");
    expect(manager).toContain('Restore destination to Draft');
  });
});

describe('a slug collision explains itself', () => {
  it.each([
    'app/api/admin/attraction-pages/route.ts',
    'app/api/admin/attraction-pages/[id]/route.ts',
  ])('%s reports a duplicate key as a conflict', (file) => {
    const source = read(file);
    expect(source).toContain('mongoError?.code === 11000');
    expect(source).toContain('status: 409');
  });

  it('shows the reason in the form instead of a generic message', () => {
    expect(read('components/admin/AttractionPageForm.tsx'))
      .toContain("[data.error, data.details].filter(Boolean).join(' — ')");
  });
});

describe('tour editor pickers are searchable', () => {
  it.each(['categories', 'attractions', 'Category 2 pages'])('offers a search box for %s', (label) => {
    expect(read('components/TourForm.tsx')).toContain(`searchPlaceholder="Search ${label}…"`);
  });

  it('shows the search box however short the list is', () => {
    expect(read('components/admin/SearchableCheckboxList.tsx')).toContain('searchThreshold = 0');
  });
});

describe('partial page updates never blank content arrays', () => {
  // Archiving from the list row sends only {archivedAt}. The PUT used to
  // coerce images/highlights/features/keywords to [] whenever they were
  // absent from the body — every archive click wiped the page's gallery.
  it('gates the array coercions on the key being present in the request', () => {
    const fs = require('node:fs');
    const source = fs.readFileSync('app/api/admin/attraction-pages/[id]/route.ts', 'utf8');
    for (const field of ['images', 'highlights', 'features', 'keywords']) {
      expect(source).toContain(`'${field}' in body`);
    }
    expect(source).not.toMatch(/^\s*images: Array\.isArray/m);
  });
});

describe('partial tour updates never reset availability', () => {
  // Restore-to-draft (and any other minimal PUT) sends only its own fields.
  // The route used to fabricate a daily/10:00/capacity-10 availability when
  // the body carried none — silently rewriting real schedules.
  it('normalizes availability only when the request sends it', () => {
    const fs = require('node:fs');
    const source = fs.readFileSync('app/api/admin/tours/[id]/route.ts', 'utf8');
    expect(source).not.toContain("body.availability = {");
    expect(source).toContain('if (body.availability) {');
  });
});
