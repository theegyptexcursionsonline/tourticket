import { render, screen, waitFor } from '@testing-library/react';
import ProtectedRoute from '@/components/ProtectedRoute';

const replace = jest.fn();
let pathname = '/user/bookings';
let authState = {
  user: null as null | { id: string },
  isLoading: false,
  isAuthenticated: false,
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    replace.mockClear();
    pathname = '/user/bookings';
    window.history.replaceState(null, '', '/user/bookings');
    authState = { user: null, isLoading: false, isAuthenticated: false };
  });

  it('preserves the protected destination when sending a signed-out customer to login', async () => {
    render(<ProtectedRoute><div>Private bookings</div></ProtectedRoute>);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login?redirect=%2Fuser%2Fbookings');
    });
    expect(screen.queryByText('Private bookings')).not.toBeInTheDocument();
  });

  it('preserves the protected destination query as part of the same-site return path', async () => {
    pathname = '/user/bookings';
    window.history.replaceState(null, '', '/user/bookings?page=2&status=confirmed');

    render(<ProtectedRoute><div>Private bookings</div></ProtectedRoute>);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        '/login?redirect=%2Fuser%2Fbookings%3Fpage%3D2%26status%3Dconfirmed',
      );
    });
  });

  it('renders authenticated content without redirecting', () => {
    authState = {
      user: { id: 'eeo-qa-user' },
      isLoading: false,
      isAuthenticated: true,
    };

    render(<ProtectedRoute><div>Private bookings</div></ProtectedRoute>);

    expect(screen.getByText('Private bookings')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows the supplied fallback while authentication is loading', () => {
    authState = { user: null, isLoading: true, isAuthenticated: false };

    render(
      <ProtectedRoute fallback={<div>Checking session</div>}>
        <div>Private bookings</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Checking session')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
