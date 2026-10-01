/**
 * Why a server-rendered admin page refused to render its data. Shared by the
 * server guard and the client component that renders the refusal, so this
 * module must stay free of server-only imports.
 */
export type AdminPageDenial = 'sign-in-required' | 'forbidden' | 'unavailable';
