import { readJsonResponse } from '@/lib/http/readJsonResponse';

const response = (
  body: string,
  options: { ok?: boolean; status?: number } = {},
) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  text: jest.fn().mockResolvedValue(body),
});

describe('readJsonResponse', () => {
  it('returns parsed JSON', async () => {
    await expect(
      readJsonResponse<{ success: boolean }>(
        response('{"success":true}'),
        'Request failed.',
      ),
    ).resolves.toEqual({ success: true });
  });

  it('replaces an empty error response with the supplied user-safe message', async () => {
    await expect(
      readJsonResponse(
        response('', { ok: false, status: 500 }),
        'Unable to invite this teammate.',
      ),
    ).rejects.toThrow('Unable to invite this teammate.');
  });

  it('does not expose a JSON parser error for an HTML gateway response', async () => {
    await expect(
      readJsonResponse(
        response('<html>Bad gateway</html>', { ok: false, status: 502 }),
        'Unable to invite this teammate.',
      ),
    ).rejects.toThrow('Unable to invite this teammate.');
  });
});
