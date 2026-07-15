import { render, waitFor } from '@testing-library/react';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';

jest.mock('@sentry/nextjs', () => ({ captureMessage: jest.fn() }));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AdminAuthProvider first load', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('revalidates the HttpOnly cookie exactly once after storing the profile sentinel', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['manageDashboard'],
        },
      }),
    } as Response);

    render(
      <AdminAuthProvider>
        <div>Admin app</div>
      </AdminAuthProvider>,
    );

    await waitFor(() => expect(sessionStorage.getItem('admin-session-profile')).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/auth/me', { headers: undefined });
  });
});
