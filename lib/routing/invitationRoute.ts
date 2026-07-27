/**
 * Invitation acceptance is public and locale-aware. Invitees have no admin
 * session yet, so dashboard routing must never rewrite this path below
 * `/admin`.
 */
export function isInvitationAcceptPath(pathname: string): boolean {
  return /^\/(?:[a-z]{2}\/)?accept-invitation(?:\/.*)?$/.test(pathname);
}
