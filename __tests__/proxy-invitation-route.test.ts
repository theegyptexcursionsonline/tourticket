import { isInvitationAcceptPath } from '@/lib/routing/invitationRoute';

describe('dashboard invitation routing', () => {
  it.each([
    '/accept-invitation',
    '/accept-invitation/',
    '/en/accept-invitation',
    '/de/accept-invitation/',
  ])('recognizes the public invitation route: %s', (path) => {
    expect(isInvitationAcceptPath(path)).toBe(true);
  });

  it.each(['/team', '/admin/team', '/accept-invitations', '/tour/accept-invitation'])(
    'does not exempt unrelated dashboard routes: %s',
    (path) => {
      expect(isInvitationAcceptPath(path)).toBe(false);
    }
  );
});
