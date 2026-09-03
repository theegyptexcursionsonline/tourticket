/**
 * Customer authentication runs entirely on the platform's own credential
 * store. No external identity provider is called.
 *
 * History this pins: the storefront's sign-in depended on a single external
 * provider. When that provider's project was suspended on 2026-09-03, sign-in,
 * sign-up and password reset all died at once and the page rendered the
 * provider's raw error — API key included — to visitors. Auth now has no such
 * dependency, and no provider text can reach a customer.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';

// `jest.setup.js` replaces this context with a stub for every component test,
// which is why the real sign-in logic was invisible to the suite for so long.
jest.unmock('@/contexts/AuthContext');

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/login',
  useRouter: () => ({ push: mockPush }),
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
let googleAvailable: boolean | undefined;

function Harness() {
  const { login, signup, logout, loginWithGoogle, isAuthenticated, user, googleSignInAvailable } = useAuth();
  googleAvailable = googleSignInAvailable;
  const run = (fn: () => Promise<void>) => async () => {
    try {
      await fn();
    } catch (e) {
      lastError = (e as Error).message;
    }
  };
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? ''}</span>
      <span data-testid="provider">{user?.authProvider ?? ''}</span>
      <button onClick={run(() => login('traveller@example.com', 'correct-horse'))}>login</button>
      <button
        onClick={run(() =>
          signup({
            firstName: 'Test',
            lastName: 'Traveller',
            email: 'traveller@example.com',
            password: 'correct-horse-battery',
          }),
        )}
      >
        signup
      </button>
      <button onClick={run(() => loginWithGoogle())}>google</button>
      <button onClick={run(() => logout())}>logout</button>
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
  googleAvailable = undefined;
  mockPlatformSession.mockResolvedValue(null);
  // The same-origin preflight that applies the platform's abuse limits.
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) }) as unknown as typeof fetch;
});

describe('sign-in', () => {
  it('authenticates against the platform store with no provider call', async () => {
    mockPlatformLogin.mockResolvedValue({ ok: true, status: 200, token: 't', user: platformCustomer });

    await mount();
    await click('login');

    expect(mockPlatformLogin).toHaveBeenCalledWith('traveller@example.com', 'correct-horse');
    expect(screen.getByTestId('authed').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('traveller@example.com');
    expect(screen.getByTestId('provider').textContent).toBe('jwt');
    expect(lastError).toBe('');
  });

  it('reports a rejected credential in wording that cannot enumerate accounts', async () => {
    mockPlatformLogin.mockResolvedValue({ ok: false, status: 401, error: 'Invalid credentials' });

    await mount();
    await click('login');

    expect(screen.getByTestId('authed').textContent).toBe('false');
    // Identical for an unknown email and a wrong password.
    expect(lastError).toBe('Invalid credentials');
  });

  it('surfaces the platform rate limit rather than masking it', async () => {
    mockPlatformLogin.mockResolvedValue({
      ok: false,
      status: 429,
      error: 'Too many login attempts. Try again later.',
    });

    await mount();
    await click('login');

    expect(lastError).toBe('Too many login attempts. Try again later.');
  });

  it('stops before the credential check when the abuse preflight refuses', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: 'Too many attempts.' }) }) as unknown as typeof fetch;

    await mount();
    await click('login');

    expect(mockPlatformLogin).not.toHaveBeenCalled();
    expect(lastError).toBe('Too many attempts.');
  });

  it('never leaks provider vocabulary when the platform is unreachable', async () => {
    mockPlatformLogin.mockResolvedValue({ ok: false, status: 0 });

    await mount();
    await click('login');

    const message = lastError.toLowerCase();
    for (const forbidden of ['firebase', 'api-key', 'aizasy', 'suspended', 'consumer']) {
      expect(message).not.toContain(forbidden);
    }
    expect(message.length).toBeGreaterThan(10);
  });
});

describe('sign-up', () => {
  it('creates the account and signs the customer straight in', async () => {
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
  });

  it('passes through the platform copy for an email that already exists', async () => {
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

describe('federated sign-in', () => {
  it('is declared unavailable so the UI hides the control instead of offering a dead one', async () => {
    await mount();
    expect(googleAvailable).toBe(false);
  });

  it('fails honestly and points at the method that works', async () => {
    await mount();
    await click('google');
    expect(lastError).toContain('email and password');
    expect(lastError.toLowerCase()).not.toContain('firebase');
  });
});

describe('session restore and sign-out', () => {
  it('restores an existing platform session on load', async () => {
    mockPlatformSession.mockResolvedValue(platformCustomer);

    await mount();

    expect(screen.getByTestId('authed').textContent).toBe('true');
    expect(screen.getByTestId('provider').textContent).toBe('jwt');
  });

  it('signs out by clearing the platform session', async () => {
    mockPlatformSession.mockResolvedValue(platformCustomer);

    await mount();
    expect(screen.getByTestId('authed').textContent).toBe('true');

    await click('logout');

    expect(mockPlatformLogout).toHaveBeenCalled();
    expect(screen.getByTestId('authed').textContent).toBe('false');
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(lastError).toBe('');
  });
});
