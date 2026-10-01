jest.mock('@/lib/auth/adminPageAccess', () => ({ authorizeAdminPage: async () => ({ granted: true }) }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/app/admin/blog/BlogManager', () => ({ __esModule: true, default: () => null }));
const mockFind = jest.fn();
const mockQuery: Record<string, jest.Mock> = {};
jest.mock('@/lib/models/Blog', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockFind(...args) } }));
import AdminBlogPage from '@/app/admin/blog/page';
beforeEach(() => {
  mockFind.mockReset();
  mockQuery.sort = jest.fn().mockReturnValue(mockQuery);
  mockQuery.populate = jest.fn().mockReturnValue(mockQuery);
  mockQuery.lean = jest.fn().mockResolvedValue([]);
  mockFind.mockReturnValue(mockQuery);
});
it('keeps archived drafts out of the active admin page query', async () => {
  await AdminBlogPage();
  expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ archivedAt: null }));
});
