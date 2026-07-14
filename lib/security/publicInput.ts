export class PublicInputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PublicInputError';
    this.status = status;
  }
}

export async function readBoundedJson<T>(request: Request, maximumBytes = 8_192): Promise<T> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw new PublicInputError('Content-Type must be application/json.', 415);
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new PublicInputError('Request body is too large.', 413);
  }

  // A small fallback keeps direct route-handler tests compatible with their
  // lightweight Request doubles. Real Next.js requests always use the bounded
  // byte path below, including when Content-Length is omitted.
  if (typeof request.arrayBuffer !== 'function') {
    return request.json() as Promise<T>;
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > maximumBytes) {
    throw new PublicInputError('Request body is too large.', 413);
  }

  try {
    return JSON.parse(Buffer.from(body).toString('utf8')) as T;
  } catch {
    throw new PublicInputError('Request body must contain valid JSON.');
  }
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

export function normalizeBoundedText(
  value: unknown,
  options: { minimum: number; maximum: number; collapseWhitespace?: boolean },
): string | null {
  if (typeof value !== 'string') return null;
  const normalized = options.collapseWhitespace === false
    ? value.trim()
    : value.trim().replace(/\s+/g, ' ');
  if (normalized.length < options.minimum || normalized.length > options.maximum) return null;
  return normalized;
}
