/**
 * Customer authentication must survive the identity provider being
 * unavailable.
 *
 * On 2026-09-03 the Google project behind sign-in was suspended and every
 * sign-in and sign-up on the storefront failed, with the provider's raw error
 * — API key included — rendered to visitors. These tests pin the behaviour
 * that prevents both halves of that: fall back to the platform's own
 * credential store on a provider outage, and never surface provider text.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';

// `jest.setup.js` replaces this context with a stub for every component test,
// which is convenient there and means the real customer sign-in logic has
// never been exercised by the suite. Exercise the real one here.
jest.unmock('@/contexts/AuthContext');

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/login',
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateProfile = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChanged = jest.fn();

jest.mock('@/lib/firebase/config', () => ({
  __esModule: true,
  auth: { name: 'test-auth' },
  googleProvider: { name: 'google' },
  isFirebaseClientConfigured: true,
}));

jest.mock('firebase/auth', () => ({
  __esModule: true,
  signInWithEmailAndPassword: (...a: unknown[]) => mockSignIn(...a),
  createUserWithEmailAndPassword: (...a: unknown[]) => mockCreateUser(...a),
  updateProfile: (...a: unknown[]) => mockUpdateProfile(...a),
  signOut: (...a: unknown[]) => mockSignOut(...a),
  onAuthStateChanged: (...a: unknown[]) => mockOnAuthStateChanged(...a),
}));

const mockPlatformLogin = jest.fn();
const mockPlatformSignup = jest.fn();
const mockPlatformSession = jest.fn();
const mockPlatformLogout = jest.fn();
jest.mock('@/lib/auth/platformAuth', () => ({
  __esModule: true,
  platformLogin: (...a: unknown[]) => mockPlatformLogin(...a),
  platformSignup: (...a: unknown[]) => mockPlatformSignup(...a),
  platformSession: (...a: unknown[]) => mockPlatformSession(...a),
  platformLogout: (...a: unknown[]) => mockPlatformLogout(...a),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function suspendedProjectError() {
  const error = new Error(
    "Firebase: Error (auth/permission-denied:-consumer-'api-key:aizasyc3nhtgnodh4vgm8pvyedpbzggzdcrrg-w'-has-been-suspended.).",
  );
  Object.assign(error, {
    code: "auth/permission-denied:-consumer-'api-key:aizasyc3nhtgnodh4vgm8pvyedpbzggzdcrrg-w'-has-been-suspended.",
  });
  return error;
}

const platformCustomer = {
  id: 'user-1',
  _id: 'user-1',
  email: 'traveller@example.com',
  firstName: 'Test',
  lastName: 'Traveller',
  role: 'customer',
  permissions: [],
};

let lastError = '';

function Harness() {
  const { login, signup, logout, isAuthenticated, user } = useAuth();
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? ''}</span>
      <span data-testid="provider">{user?.authProvider ?? ''}</span>
      <button
        onClick={async () => {
          try {
            await login('traveller@example.com', 'correct-horse');
          } catch (e) {
            lastError = (e as Error).message;
          }
        }}
      >
        login
      </button>
      <button
        onClick={async () => {
          try {
            await signup({
              firstName: 'Test',
              lastName: 'Traveller',
              email: 'traveller@example.com',
              password: 'correct-horse-battery',
            });
          } catch (e) {
            lastError = (e as Error).message;
          }
        }}
      >
        signup
      </button>
      <button
        onClick={async () => {
          try {
            await logout();
          } catch (e) {
            lastError = (e as Error).message;
          }
        }}
      >
        logout
      </button>
    </div>
  );
}

async function mount() {
  await act(async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
  });
}

async function click(name: string) {
  await act(async () => {
    screen.getByText(name).click();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  lastError = '';
  // No provider session on mount, and no platform session either.
  mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (u: unknown) => void) => {
    cb(null);
    return () => {};
  });
  mockPlatformSession.mockResolvedValue(null);
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 204,
    json: async () => ({}),
  }) as unknown as typeof fetch;
});

describe('login when the identity provider is unavailable', () => {
  it('signs the customer in through the platform credential store', async () => {
    mockSignIn.mockRejectedValue(suspendedProjectError());
    mockPlatformLogin.mockResolvedValue({ ok: true, status: 200, token: 't', user: platformCustomer });

    await mount();
    await click('login');

    expect(mockPlatformLogin).toHaveBeenCalledWith('traveller@example.com', 'correct-horse');
    expect(screen.getByTestId('authed').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('traveller@example.com');
    expect(screen.getByTestId('provider').textContent).toBe('jwt');
    expect(lastError).toBe('');
  });

  it('shows a message that names no provider and leaks no key when the fallback cannot serve', async () => {
    mockSignIn.mockRejectedValue(suspendedProjectError());
    mockPlatformLogin.mockResolvedValue({ ok: false, status: 401 });

    await mount();
    await click('login');

    expect(screen.getByTestId('authed').textContent).toBe('false');
    const message = lastError.toLowerCase();
    expect(message).not.toContain('firebase');
    expect(message).not.toContain('api-key');
    expect(message).not.toContain('aizasy');
    expect(message).not.toContain('suspended');
    expect(message).toContain('reset your password');
  });

  it('surfaces the platform rate limit rather than masking it', async () => {
    mockSignIn.mockRejectedValue(suspendedProjectError());
    mockPlatformLogin.mockResolvedValue({
      ok: false,
      status: 429,
      error: 'Too many login attempts. Try again later.',
    });

    await mount();
    await click('login');

    expect(lastError).toBe('Too many login attempts. Try again later.');
  });
});

describe('login when the credential itself is rejected', () => {
  it('does not replay the credential against the platform store', async () => {
    const wrongPassword = new Error('bad');
    Object.assign(wrongPassword, { code: 'auth/invalid-credential' });
    mockSignIn.mockRejectedValue(wrongPassword);

    await mount();
    await click('login');

    expect(mockPlatformLogin).not.toHaveBeenCalled();
    expect(lastError).toBe('Invalid email or password.');
  });
});

describe('signup when the identity provider is unavailable', () => {
  it('creates the account on the platform and signs the customer straight in', async () => {
    mockCreateUser.mockRejectedValue(suspendedProjectError());
    mockPlatformSignup.mockResolvedValue({ ok: true, status: 200, token: 't', user: platformCustomer });

    await mount();
    await click('signup');

    expect(mockPlatformSignup).toHaveBeenCalledWith({
      firstName: 'Test',
      lastName: 'Traveller',
      email: 'traveller@example.com',
      password: 'correct-horse-battery',
    });
    expect(screen.getByTestId('authed').textContent).toBe('true');
    expect(screen.getByTestId('provider').textContent).toBe('jwt');
  });

  it('passes through the platform copy for an email that already exists', async () => {
    mockCreateUser.mockRejectedValue(suspendedProjectError());
    mockPlatformSignup.mockResolvedValue({
      ok: false,
      status: 409,
      error: 'An account with this email already exists. Sign in with a verified email to continue.',
    });

    await mount();
    await click('signup');

    expect(lastError).toContain('already exists');
    expect(lastError.toLowerCase()).not.toContain('firebase');
  });
});

describe('session restore and sign-out', () => {
  it('restores a platform session when the provider reports nobody signed in', async () => {
    mockPlatformSession.mockResolvedValue(platformCustomer);

    await mount();

    expect(screen.getByTestId('authed').textContent).toBe('true');
    expect(screen.getByTestId('provider').textContent).toBe('jwt');
  });

  it('signs the customer out even when the provider cannot be reached', async () => {
    mockPlatformSession.mockResolvedValue(platformCustomer);
    mockSignOut.mockRejectedValue(suspendedProjectError());

    await mount();
    expect(screen.getByTestId('authed').textContent).toBe('true');

    await click('logout');

    expect(mockPlatformLogout).toHaveBeenCalled();
    expect(screen.getByTestId('authed').textContent).toBe('false');
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(lastError).toBe('');
  });
});
