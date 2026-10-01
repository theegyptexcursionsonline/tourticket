import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminPageAccessState, {
  AdminLoadFailed,
  AdminSessionCheck,
} from '@/components/admin/AdminPageAccessState';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const router = { refresh: jest.fn(), replace: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/contexts/AdminAuthContext', () => ({ useAdminAuth: jest.fn() }));

const adminAuth = useAdminAuth as jest.Mock;
let refreshUser: jest.Mock;

function session(overrides: Record<string, unknown> = {}) {
  adminAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, refreshUser, ...overrides });
}

beforeEach(() => {
  jest.clearAllMocks();
  refreshUser = jest.fn(() => Promise.resolve());
  session();
  window.history.replaceState({}, '', '/blog');
});

describe('refusals', () => {
  it('explains a missing permission without showing any data', () => {
    render(<AdminPageAccessState denial="forbidden" requiredPermissions={['manageContent']} />);

    expect(screen.getByText('Access restricted')).toBeInTheDocument();
    expect(screen.getByText('manageContent')).toBeInTheDocument();
  });

  it('offers a retry when access could not be decided', () => {
    render(<AdminPageAccessState denial="unavailable" />);

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't confirm your access");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('says a failed read failed instead of rendering an empty list', () => {
    render(<AdminLoadFailed what="blog posts" />);

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the blog posts");
  });
});

describe('AdminSessionCheck', () => {
  it('waits while the browser has no session (the layout shows the sign-in form)', () => {
    render(<AdminPageAccessState denial="sign-in-required" />);

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('asks the server to render the page again once the admin is signed in — exactly once', async () => {
    const { rerender } = render(<AdminSessionCheck />);
    session({ isAuthenticated: true });
    rerender(<AdminSessionCheck />);
    rerender(<AdminSessionCheck />);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  });

  it('re-checks the session with the API when the server still refuses it, then offers a reload', async () => {
    session({ isAuthenticated: true });
    render(<AdminSessionCheck />);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refreshUser).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toHaveTextContent('This page could not be opened');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('does not refresh before the session finished loading', async () => {
    session({ isAuthenticated: true, isLoading: true });
    render(<AdminSessionCheck />);
    await act(async () => undefined);

    expect(router.refresh).not.toHaveBeenCalled();
    expect(refreshUser).not.toHaveBeenCalled();
  });

  it.each([
    ['/sign-in', '/'],
    ['/admin/sign-in', '/admin'],
  ])('opened at %s while signed in, it goes to the dashboard', async (address, dashboard) => {
    window.history.replaceState({}, '', address);
    session({ isAuthenticated: true });
    render(<AdminSessionCheck />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(dashboard));
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
