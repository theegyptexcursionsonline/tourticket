import fs from 'node:fs';
import path from 'node:path';
import { auditStamp } from '@/lib/admin/auditStamp';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('archived is its own status, not a draft', () => {
  const list = read('app/admin/tours/ToursListClient.tsx');

  it('offers an Archived tab', () => {
    expect(list).toContain("id: 'archived' as TabFilter");
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
  it.each(['categories', 'attractions', 'catalogue pages'])('offers a search box for %s', (label) => {
    expect(read('components/TourForm.tsx')).toContain(`searchPlaceholder="Search ${label}…"`);
  });

  it('shows the search box however short the list is', () => {
    expect(read('components/admin/SearchableCheckboxList.tsx')).toContain('searchThreshold = 0');
  });
});
