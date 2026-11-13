import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BlogNewsletterForm } from '@/app/[locale]/blog/[slug]/BlogNewsletterForm';
import { strictTranslator } from '@/test-support/blogIntl';

let mockLocale = 'en';
jest.mock('next-intl', () => jest.requireActual('@/test-support/blogIntl').realIntl(() => mockLocale));

// Before 12 Nov 2026 this form showed a "Subscribed" toast and saved nothing.
// It now asks the subscribe route of the site and reports what the route says.
const words = (locale = mockLocale) => strictTranslator(locale, 'blog.newsletter');

function answer(status: number, body: Record<string, unknown>) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function fill(email = 'reader@example.com', consent = true) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: email } });
  if (consent) fireEvent.click(screen.getByRole('checkbox'));
}

const submit = () => fireEvent.submit(screen.getByTestId('blog-newsletter-form'));

describe('article newsletter form', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    mockLocale = 'en';
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('sends the address, the blog source and the consent to the subscribe route', async () => {
    fetchMock.mockResolvedValue(answer(202, { success: true, status: 'pending' }));
    render(<BlogNewsletterForm />);
    fill(' Reader@Example.com ');
    await act(async () => { submit(); });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/subscribe');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ email: 'Reader@Example.com', source: 'blog', consent: true });
  });

  it('tells the reader to confirm by email once the route accepts the request', async () => {
    fetchMock.mockResolvedValue(answer(202, { success: true, status: 'pending' }));
    render(<BlogNewsletterForm />);
    fill();
    await act(async () => { submit(); });

    const result = await screen.findByTestId('blog-newsletter-result');
    expect(result).toHaveTextContent(words()('pendingTitle'));
    expect(result).toHaveTextContent('Check your inbox and confirm your email to finish subscribing.');
    expect(screen.queryByTestId('blog-newsletter-form')).toBeNull();
  });

  it('says so when the address is already confirmed', async () => {
    fetchMock.mockResolvedValue(answer(200, { success: true, status: 'confirmed', replayed: true }));
    render(<BlogNewsletterForm />);
    fill();
    await act(async () => { submit(); });
    expect(await screen.findByTestId('blog-newsletter-result')).toHaveTextContent(words()('confirmedBody'));
  });

  it.each([
    [400, { success: false, error: 'Please enter a valid email address.' }, 'invalidEmail'],
    [429, { success: false, error: 'Too many newsletter requests. Please try again later.' }, 'tooMany'],
    [503, { success: false, saved: true, status: 'pending' }, 'savedNotDelivered'],
    [503, { success: false }, 'unavailable'],
    [500, {}, 'failed'],
  ])('shows no success when the route answers %i %j', async (status, body, key) => {
    fetchMock.mockResolvedValue(answer(status, body));
    render(<BlogNewsletterForm />);
    fill();
    await act(async () => { submit(); });

    expect(await screen.findByRole('alert')).toHaveTextContent(words()(key));
    expect(screen.queryByTestId('blog-newsletter-result')).toBeNull();
    // The form stays, with the address still in it, so the reader can try again.
    expect(screen.getByRole('textbox')).toHaveValue('reader@example.com');
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('shows no success when the request never reaches the site', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<BlogNewsletterForm />);
    fill();
    await act(async () => { submit(); });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(words()('failed'));
    expect(alert).not.toHaveTextContent('Failed to fetch');
    expect(screen.queryByTestId('blog-newsletter-result')).toBeNull();
  });

  it('sends one request when the form is submitted twice in a row', async () => {
    let release: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => { release = resolve; }));
    render(<BlogNewsletterForm />);
    fill();
    submit();
    submit();
    submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // While the request is out, the button is busy and cannot be pressed again.
    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
    expect(screen.getByRole('button')).toHaveTextContent(words()('submitting'));
    await act(async () => { release(answer(202, { success: true, status: 'pending' })); });
    expect(await screen.findByTestId('blog-newsletter-result')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('can be sent again after a refusal', async () => {
    fetchMock.mockResolvedValueOnce(answer(503, { success: false }));
    fetchMock.mockResolvedValueOnce(answer(202, { success: true, status: 'pending' }));
    render(<BlogNewsletterForm />);
    fill();
    await act(async () => { submit(); });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await act(async () => { submit(); });
    expect(await screen.findByTestId('blog-newsletter-result')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('asks nothing of the route without consent or without an address', async () => {
    render(<BlogNewsletterForm />);
    // The button stays off until the consent box is ticked.
    expect(screen.getByRole('button')).toBeDisabled();
    fill('reader@example.com', false);
    await act(async () => { submit(); });
    expect(screen.getByRole('alert')).toHaveTextContent(words()('consentRequired'));

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => { submit(); });
    expect(screen.getByRole('alert')).toHaveTextContent(words()('invalidEmail'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('links the consent line to the privacy policy', () => {
    render(<BlogNewsletterForm />);
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByText(/I agree to receive marketing emails/)).toBeInTheDocument();
  });

  it.each(['ar', 'es', 'fr', 'de'])('reads in %s, including what the route refuses', async (locale) => {
    mockLocale = locale;
    fetchMock.mockResolvedValue(answer(429, { success: false, error: 'Too many newsletter requests. Please try again later.' }));
    const { container } = render(<BlogNewsletterForm />);
    const t = words(locale);
    expect(container).toHaveTextContent(t('title'));
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', t('emailPlaceholder'));
    expect(screen.getByRole('button')).toHaveTextContent(t('submit'));
    fill();
    await act(async () => { submit(); });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(t('tooMany'));
    expect(container).not.toHaveTextContent('Too many newsletter requests');
    expect(container).not.toHaveTextContent('Subscribe');
  });
});
