import type { Metadata } from 'next';

/**
 * Private and transactional pages must never inherit the storefront layout's
 * public indexability. Keep this object shared so every nested layout emits
 * the same fail-closed crawler contract.
 */
export const PRIVATE_ROUTE_METADATA: Metadata = {
  // Intentionally empty: private routes never declare a canonical or language
  // alternate. The shared locale layout also carries no alternates, because
  // Next metadata inheritance cannot reliably clear a parent canonical.
  alternates: {},
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};
