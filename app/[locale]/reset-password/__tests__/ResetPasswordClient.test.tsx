import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordClient from '../ResetPasswordClient';

describe('ResetPasswordClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    window.history.replaceState({}, '', `/reset-password?token=${'a'.repeat(64)}`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders an actionable form and removes the reset capability from history', async () => {
    render(<ResetPasswordClient token={'a'.repeat(64)} />);

    expect(await screen.findByLabelText('newPassword')).toBeInTheDocument();
    expect(screen.getByLabelText('confirmPassword')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('fails closed for malformed links without contacting the API', async () => {
    window.history.replaceState({}, '', '/reset-password');
    render(<ResetPasswordClient token="" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid.title');
    expect(screen.getByRole('link', {name: 'invalid.requestNew'})).toHaveAttribute('href', '/forgot');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('validates matching passwords before submitting', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordClient token={'a'.repeat(64)} />);

    await user.type(await screen.findByLabelText('newPassword'), 'StrongPass123!');
    await user.type(screen.getByLabelText('confirmPassword'), 'DifferentPass123!');
    await user.click(screen.getByRole('button', {name: 'updatePassword'}));

    expect(screen.getByRole('alert')).toHaveTextContent('errors.passwordMismatch');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits the one-time token and moves to the success state', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({success: true}),
    });
    const user = userEvent.setup();
    render(<ResetPasswordClient token={'a'.repeat(64)} />);

    await user.type(await screen.findByLabelText('newPassword'), 'StrongPass123!');
    await user.type(screen.getByLabelText('confirmPassword'), 'StrongPass123!');
    await user.click(screen.getByRole('button', {name: 'updatePassword'}));

    await waitFor(() => expect(screen.getByRole('link', {name: 'success.signIn'})).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/mobile-auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('StrongPass123!'),
      }),
    );
  });
});
