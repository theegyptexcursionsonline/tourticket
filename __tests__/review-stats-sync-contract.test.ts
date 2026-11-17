import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

// Every route that creates, edits, approves, hides or removes a review must
// recount the trip through the one rule, so stored figures never drift.
describe('every review change recounts the trip', () => {
  it('the review form recounts after a new review, with no second unscoped average', () => {
    const source = read('app/api/tours/[tourId]/reviews/route.ts');
    expect(source).toContain('await syncTourReviewStatsSafely(tourId);');
    expect(source).not.toContain("avgRating: { $avg: '$rating' }");
  });

  it('a customer edit and a customer removal recount', () => {
    const source = read('app/api/reviews/[id]/route.ts');
    expect(source.match(/await syncTourReviewStatsSafely\(review\.tour\);/g)).toHaveLength(2);
  });

  it('an admin approve/hide and an admin delete recount', () => {
    const source = read('app/api/admin/reviews/[id]/route.ts');
    expect(source).toContain('await syncTourReviewStatsSafely(updatedReview.tour);');
    expect(source).toContain('await syncTourReviewStatsSafely(deletedReview.tour);');
  });

  it('no other code computes a trip rating from reviews', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          walk(rel);
        } else if (/\.(ts|tsx)$/.test(entry.name) && rel !== path.join('lib', 'models', 'Tour.ts')) {
          const text = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
          if (/Review\.aggregate\(/.test(text) && /\$avg/.test(text) && !rel.startsWith(path.join('lib', 'reviews'))
            && !rel.startsWith(path.join('app', 'api', 'admin', 'reviews'))) offenders.push(rel);
        }
      }
    };
    walk('app');
    walk('lib');
    expect(offenders).toEqual([]);
  });
});
