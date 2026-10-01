/**
 * Behaviour of the server-rendered admin pages that read data. The anonymous
 * `curl` on dashboard2 received the blog list and unpublished destinations
 * because these pages queried the database before anything checked who was
 * asking. A refused request must now render no record and touch no model.
 */
import { render, screen } from '@testing-library/react';
import { authorizeAdminPage } from '@/lib/auth/adminPageAccess';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { redirect } from 'next/navigation';
import AdminBlogPage from '@/app/admin/blog/page';
import DestinationsPage from '@/app/admin/destinations/page';
import AdminCategoryRoute from '@/app/admin/categories/[id]/page';

jest.mock('@/lib/auth/adminPageAccess', () => ({ authorizeAdminPage: jest.fn() }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));

function queryChain(result: () => unknown) {
  const chain: Record<string, jest.Mock> = {};
  for (const step of ['sort', 'populate', 'select']) chain[step] = jest.fn(() => chain);
  chain.lean = jest.fn(async () => result());
  return chain;
}

jest.mock('@/lib/models/Blog', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

jest.mock('@/app/admin/blog/BlogManager', () => ({
  __esModule: true,
  default: ({ initialBlogs }: { initialBlogs: Array<{ title: string }> }) => (
    <ul aria-label="blog posts">
      {initialBlogs.map((blog) => (
        <li key={blog.title}>{blog.title}</li>
      ))}
    </ul>
  ),
}));
jest.mock('@/app/admin/destinations/DestinationManager', () => ({
  __esModule: true,
  default: ({ initialDestinations }: { initialDestinations: Array<{ name: string; tourCount: number }> }) => (
    <ul aria-label="destinations">
      {initialDestinations.map((destination) => (
        <li key={destination.name}>{`${destination.name} (${destination.tourCount})`}</li>
      ))}
    </ul>
  ),
}));
jest.mock('@/components/admin/AdminPageAccessState', () => ({
  __esModule: true,
  default: ({ denial }: { denial: string }) => <p role="alert">{`refused:${denial}`}</p>,
  AdminLoadFailed: ({ what }: { what: string }) => <p role="alert">{`load-failed:${what}`}</p>,
}));

const authorize = authorizeAdminPage as jest.MockedFunction<typeof authorizeAdminPage>;
const connect = dbConnect as unknown as jest.Mock;
const blogFind = (Blog as unknown as { find: jest.Mock }).find;
const destinationFind = (Destination as unknown as { find: jest.Mock }).find;
const tourFind = (Tour as unknown as { find: jest.Mock }).find;

const PRIVATE_BLOGS = [
  { _id: 'b1', title: 'Draft: unpublished launch plan' },
  { _id: 'b2', title: 'Published travel tips' },
];
const PRIVATE_DESTINATIONS = [
  { _id: 'd1', name: 'Siwa (unpublished)', slug: 'siwa', isPublished: false },
  { _id: 'd2', name: 'Luxor', slug: 'luxor', isPublished: true },
];

const granted = {
  granted: true as const,
  auth: {
    userId: 'a'.repeat(24),
    role: 'admin' as const,
    permissions: [],
    twoFactorEnabled: true,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  blogFind.mockImplementation(() => queryChain(() => PRIVATE_BLOGS));
  destinationFind.mockImplementation(() => queryChain(() => PRIVATE_DESTINATIONS));
  tourFind.mockImplementation(() => queryChain(() => [{ destination: 'd2' }, { destination: 'd2' }]));
});

describe.each([
  ['sign-in-required', 'an anonymous request'],
  ['forbidden', 'an admin without manageContent, a network-only (multi-tenant portal) admin, or an admin with 2FA setup pending'],
  ['unavailable', 'a request whose authorization could not be decided'],
] as const)('refused (%s): %s', (denial, _who) => {
  beforeEach(() => {
    authorize.mockResolvedValue({ granted: false, denial });
  });

  it('the blog page reads nothing and renders no post', async () => {
    const { container } = render(await AdminBlogPage());

    expect(authorize).toHaveBeenCalledWith(['manageContent']);
    expect(connect).not.toHaveBeenCalled();
    expect(blogFind).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(`refused:${denial}`);
    expect(container.textContent).not.toMatch(/unpublished launch plan|travel tips/);
  });

  it('the destinations page reads nothing and renders no destination', async () => {
    const { container } = render(await DestinationsPage());

    expect(authorize).toHaveBeenCalledWith(['manageContent']);
    expect(connect).not.toHaveBeenCalled();
    expect(destinationFind).not.toHaveBeenCalled();
    expect(tourFind).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(`refused:${denial}`);
    expect(container.textContent).not.toMatch(/Siwa|Luxor/);
  });
});

describe('granted to an admin with manageContent on the main portal', () => {
  beforeEach(() => {
    authorize.mockResolvedValue(granted);
  });

  it('the blog page authorizes before its first read and lists the default-tenant posts', async () => {
    render(await AdminBlogPage());

    expect(authorize.mock.invocationCallOrder[0]).toBeLessThan(connect.mock.invocationCallOrder[0]);
    expect(blogFind).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.arrayContaining([{ tenantId: 'default' }]) }),
    );
    expect(screen.getByRole('list', { name: 'blog posts' })).toHaveTextContent('Draft: unpublished launch plan');
  });

  it('the blog page says the read failed instead of showing an empty blog', async () => {
    blogFind.mockImplementation(() => queryChain(() => {
      throw new Error('connection reset');
    }));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(await AdminBlogPage());

    expect(screen.getByRole('alert')).toHaveTextContent('load-failed:blog posts');
    expect(screen.queryByRole('list', { name: 'blog posts' })).toBeNull();
  });

  it('the destinations page authorizes before its first read and lists destinations with tour counts', async () => {
    render(await DestinationsPage());

    expect(authorize.mock.invocationCallOrder[0]).toBeLessThan(connect.mock.invocationCallOrder[0]);
    const list = screen.getByRole('list', { name: 'destinations' });
    expect(list).toHaveTextContent('Siwa (unpublished) (0)');
    expect(list).toHaveTextContent('Luxor (2)');
  });
});

describe('category id route', () => {
  it('forwards to the editor without reading the database', async () => {
    await expect(
      AdminCategoryRoute({ params: Promise.resolve({ id: '0000000000000000000000c2' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/admin/categories/0000000000000000000000c2/edit');

    expect(redirect).toHaveBeenCalledWith('/admin/categories/0000000000000000000000c2/edit');
    expect(connect).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
  });

  it('encodes a hostile id instead of letting it steer the redirect', async () => {
    await expect(
      AdminCategoryRoute({ params: Promise.resolve({ id: '../../x?y=1' }) }),
    ).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith('/admin/categories/..%2F..%2Fx%3Fy%3D1/edit');
  });
});
