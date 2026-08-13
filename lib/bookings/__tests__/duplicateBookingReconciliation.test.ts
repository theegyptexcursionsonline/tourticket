import { isLocalMongoUri } from '../duplicateBookingReconciliation';

describe('isLocalMongoUri', () => {
  it.each([
    'mongodb://localhost:27017/app',
    'mongodb://127.0.0.1:27017/app',
    'mongodb://[::1]:27017/app',
  ])('allows local development target %s', (uri) => {
    expect(isLocalMongoUri(uri)).toBe(true);
  });

  it.each([
    'mongodb+srv://cluster.example/app',
    'mongodb://db-00.example:27017,db-01.example:27017/app',
    'mongodb://localhost.example:27017/app',
  ])('treats remote and multi-host targets as remote for %s', (uri) => {
    expect(isLocalMongoUri(uri)).toBe(false);
  });
});
