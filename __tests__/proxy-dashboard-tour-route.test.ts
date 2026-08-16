import { proxy } from '@/proxy';

jest.mock('next/server', () => {
  const response = (status: number, values: Record<string, string>) => ({
    status,
    headers: {
      get: (name: string) => values[name.toLowerCase()] ?? null,
    },
  });
  return {
    NextRequest: jest.fn(),
    NextResponse: {
      rewrite: (url: URL) => response(200, { 'x-middleware-rewrite': url.toString() }),
      redirect: (url: URL, status = 307) => response(status, { location: url.toString() }),
      next: () => response(200, {}),
    },
  };
});

jest.mock('next-intl/middleware', () => ({
  __esModule: true,
  default: () => jest.fn(),
}));

const requestFor = (input: string) => {
  const url = new URL(input) as URL & { clone: () => URL };
  url.clone = () => new URL(url.toString());
  return {
    headers: { get: (name: string) => name.toLowerCase() === 'host' ? url.host : null },
    nextUrl: url,
  } as never;
};

describe('dashboard tour routes', () => {
  it('rewrites /tours/new to the admin creation page without treating new as a public slug', () => {
    const response = proxy(requestFor('https://dashboard2.egypt-excursionsonline.com/tours/new'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://dashboard2.egypt-excursionsonline.com/admin/tours/new',
    );
  });

  it('keeps redirecting legacy storefront tour links to their canonical root URL', () => {
    const response = proxy(requestFor('https://egypt-excursionsonline.com/tours/example-tour'));

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://egypt-excursionsonline.com/example-tour');
  });
});
