/**
 * Smoke tests for admin manual translation feature.
 *
 * Covers the full flow: API route → autoTranslate logic → TranslationEditor UI.
 * All external dependencies (OpenAI, MongoDB, auth) are mocked.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── 1. Mock NextResponse (must be first — jest.mock is hoisted) ───

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this._body = body;
      this.status = init?.status || 200;
    }
    async json() { return this._body; }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextResponse: MockNextResponse };
});

// ─── 2. Mock verifyAdmin ───

jest.mock('@/lib/auth/verifyAdmin', () => ({
  verifyAdmin: jest.fn(),
}));

// ─── 3. Mock OpenAI ───

const mockCreate = jest.fn();
jest.mock('@/lib/openai', () => ({
  getOpenAIClient: () => ({ chat: { completions: { create: mockCreate } } }),
}));

// ─── 4. Mock DB & Models ───

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));

const mockTourFindById = jest.fn();
const mockTourUpdate = jest.fn();
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => ({ lean: () => mockTourFindById(...args) }),
    findByIdAndUpdate: (...args: unknown[]) => mockTourUpdate(...args),
  },
}));

const mockDestFindById = jest.fn();
const mockDestUpdate = jest.fn();
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => ({ lean: () => mockDestFindById(...args) }),
    findByIdAndUpdate: (...args: unknown[]) => mockDestUpdate(...args),
  },
}));

const mockCatFindById = jest.fn();
const mockCatUpdate = jest.fn();
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => ({ lean: () => mockCatFindById(...args) }),
    findByIdAndUpdate: (...args: unknown[]) => mockCatUpdate(...args),
  },
}));

// ─── Imports (after mocks) ───

const { NextResponse } = jest.requireMock('next/server');
const { verifyAdmin } = jest.requireMock('@/lib/auth/verifyAdmin');

import { POST } from '@/app/api/admin/translate/route';
import { translateEntityFields, translateEntityFieldsForLocale } from '@/lib/i18n/autoTranslate';
import {
  tourTranslationFields,
  destinationTranslationFields,
  categoryTranslationFields,
  normalizeTranslations,
  translatableLocales,
} from '@/lib/i18n/translationFields';
import TranslationEditor from '@/components/admin/TranslationEditor';

// ─── Helpers ───

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as any;
}

const FAKE_OPENAI_RESPONSE = {
  ar: { title: 'رحلة الأهرامات', description: 'وصف بالعربية' },
  es: { title: 'Tour de las Pirámides', description: 'Descripción en español' },
  fr: { title: 'Visite des Pyramides', description: 'Description en français' },
  de: { title: 'Pyramidentour', description: 'Beschreibung auf Deutsch' },
};

function mockOpenAISuccess(response: any = FAKE_OPENAI_RESPONSE) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(response) } }],
  });
}

// ─── Tests ───

beforeEach(() => {
  jest.clearAllMocks();
  verifyAdmin.mockResolvedValue({ id: 'admin1', role: 'admin' });
});

// ════════════════════════════════════════════════════════════════
// SECTION A: API Route smoke tests
// ════════════════════════════════════════════════════════════════

describe('Smoke: POST /api/admin/translate', () => {
  it('rejects unauthenticated requests with 403', async () => {
    verifyAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    );
    const res = await POST(makeRequest({ modelType: 'tour', id: '123' }));
    expect(res.status).toBe(403);
  });

  it('rejects missing modelType with 400', async () => {
    const res = await POST(makeRequest({ id: '123' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Invalid modelType');
  });

  it('rejects missing id with 400', async () => {
    const res = await POST(makeRequest({ modelType: 'tour' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Missing id');
  });

  it('rejects unsupported modelType with 400', async () => {
    const res = await POST(makeRequest({ modelType: 'review', id: '123' }));
    expect(res.status).toBe(400);
  });

  it.each(['tour', 'destination', 'category'] as const)(
    'returns success for modelType=%s',
    async (modelType) => {
      // Set up model mocks to return a doc and OpenAI to respond
      const finders = { tour: mockTourFindById, destination: mockDestFindById, category: mockCatFindById };
      finders[modelType].mockResolvedValue({ _id: '123', title: 'Test', name: 'Test', description: 'Desc' });
      mockOpenAISuccess();

      const res = await POST(makeRequest({ modelType, id: '123' }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain(modelType);
    }
  );

  it('returns 500 when translation throws', async () => {
    mockTourFindById.mockRejectedValue(new Error('DB connection lost'));
    const res = await POST(makeRequest({ modelType: 'tour', id: '123' }));
    expect(res.status).toBe(500);
    expect((await res.json()).success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// SECTION B: translateEntityFields integration smoke
// ════════════════════════════════════════════════════════════════

describe('Smoke: translateEntityFields', () => {
  it('translates tour fields and returns all 4 locales', async () => {
    mockOpenAISuccess();

    const result = await translateEntityFields(
      { title: 'Pyramids Tour', description: 'A great tour of the pyramids' },
      tourTranslationFields,
      'tour'
    );

    // Should have all translatable locales
    for (const locale of translatableLocales) {
      expect(result).toHaveProperty(locale);
    }
    expect(result.ar.title).toBe('رحلة الأهرامات');
    expect(result.es.title).toBe('Tour de las Pirámides');
  });

  it('sends correct prompt context to OpenAI', async () => {
    mockOpenAISuccess();

    await translateEntityFields(
      { title: 'Test Tour' },
      tourTranslationFields,
      'tour'
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe('gpt-4o-mini');
    expect(callArgs.response_format).toEqual({ type: 'json_object' });
    expect(callArgs.temperature).toBe(0.3);

    const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).toContain('tour');
    expect(userMessage.content).toContain('Test Tour');
    expect(userMessage.content).toContain('Arabic');
  });

  it('skips translation when all fields are empty', async () => {
    const result = await translateEntityFields({}, tourTranslationFields, 'tour');
    expect(result).toEqual({});
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('handles array fields in translation', async () => {
    const response = {
      ar: { highlights: ['ميزة 1', 'ميزة 2'] },
      es: { highlights: ['Punto 1', 'Punto 2'] },
      fr: { highlights: ['Point 1', 'Point 2'] },
      de: { highlights: ['Punkt 1', 'Punkt 2'] },
    };
    mockOpenAISuccess(response);

    const result = await translateEntityFields(
      { highlights: ['Feature 1', 'Feature 2'] },
      tourTranslationFields,
      'tour'
    );

    expect(result.ar.highlights).toEqual(['ميزة 1', 'ميزة 2']);
    expect(result.es.highlights).toHaveLength(2);
  });

  it('returns empty object on OpenAI failure (graceful degradation)', async () => {
    mockCreate.mockRejectedValue(new Error('Rate limit'));

    const result = await translateEntityFields(
      { title: 'Test' },
      tourTranslationFields,
      'tour'
    );

    expect(result).toEqual({});
  });

  it('filters out unexpected locale keys from OpenAI response', async () => {
    mockOpenAISuccess({
      ar: { title: 'عربي' },
      es: { title: 'Español' },
      fr: { title: 'Français' },
      de: { title: 'Deutsch' },
      xx: { title: 'Unknown' }, // invalid locale
    } as Record<string, Record<string, string>>);

    const result = await translateEntityFields(
      { title: 'Test' },
      tourTranslationFields,
      'tour'
    );

    expect(result).not.toHaveProperty('xx');
    expect(Object.keys(result)).toEqual(expect.arrayContaining(['ar', 'es', 'fr', 'de']));
  });
});

// ════════════════════════════════════════════════════════════════
// SECTION C: Field config validation
// ════════════════════════════════════════════════════════════════

describe('Smoke: Translation field definitions', () => {
  it('tour fields include essential translatable keys', () => {
    const keys = tourTranslationFields.map(f => f.key);
    expect(keys).toContain('title');
    expect(keys).toContain('description');
    expect(keys).toContain('metaTitle');
    expect(keys).toContain('highlights');
  });

  it('destination fields include essential translatable keys', () => {
    const keys = destinationTranslationFields.map(f => f.key);
    expect(keys).toContain('name');
    expect(keys).toContain('description');
    expect(keys).toContain('highlights');
  });

  it('category fields include essential translatable keys', () => {
    const keys = categoryTranslationFields.map(f => f.key);
    expect(keys).toContain('name');
    expect(keys).toContain('description');
  });

  it('all field definitions have valid types', () => {
    const allFields = [
      ...tourTranslationFields,
      ...destinationTranslationFields,
      ...categoryTranslationFields,
    ];
    for (const f of allFields) {
      expect(['input', 'textarea', 'array']).toContain(f.type);
      expect(f.key).toBeTruthy();
      expect(f.label).toBeTruthy();
    }
  });

  it('translatableLocales excludes English', () => {
    expect(translatableLocales).not.toContain('en');
    expect(translatableLocales.length).toBeGreaterThanOrEqual(4);
  });
});

// ════════════════════════════════════════════════════════════════
// SECTION D: normalizeTranslations helper
// ════════════════════════════════════════════════════════════════

describe('Smoke: normalizeTranslations', () => {
  it('returns empty object for null/undefined', () => {
    expect(normalizeTranslations(null)).toEqual({});
    expect(normalizeTranslations(undefined)).toEqual({});
  });

  it('converts a Map to a plain object', () => {
    const map = new Map([
      ['ar', { title: 'عربي' }],
      ['es', { title: 'Español' }],
    ]);
    const result = normalizeTranslations(map);
    expect(result.ar).toEqual({ title: 'عربي' });
    expect(result.es).toEqual({ title: 'Español' });
  });

  it('passes through a plain object', () => {
    const obj = { ar: { title: 'عربي' }, fr: { title: 'Français' } };
    expect(normalizeTranslations(obj)).toEqual(obj);
  });
});

// ════════════════════════════════════════════════════════════════
// SECTION E: TranslationEditor UI smoke tests
// ════════════════════════════════════════════════════════════════

describe('Smoke: TranslationEditor component', () => {
  const mockOnChange = jest.fn();
  const simpleFields = [
    { key: 'title', label: 'Title', type: 'input' as const, maxLength: 200 },
    { key: 'description', label: 'Description', type: 'textarea' as const, maxLength: 1000, rows: 3 },
    { key: 'highlights', label: 'Highlights', type: 'array' as const, maxLength: 300 },
  ];

  beforeEach(() => mockOnChange.mockClear());

  it('renders locale tabs for all translatable locales', () => {
    render(<TranslationEditor fields={simpleFields} value={{}} onChange={mockOnChange} />);

    expect(screen.getByText('Arabic')).toBeInTheDocument();
    expect(screen.getByText('Spanish')).toBeInTheDocument();
    expect(screen.getByText('French')).toBeInTheDocument();
    expect(screen.getByText('German')).toBeInTheDocument();
  });

  it('renders field inputs for text and textarea types', () => {
    render(<TranslationEditor fields={simpleFields} value={{}} onChange={mockOnChange} />);

    expect(screen.getByPlaceholderText('Title in Arabic')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description in Arabic')).toBeInTheDocument();
  });

  it('switches between locale tabs', () => {
    render(<TranslationEditor fields={simpleFields} value={{}} onChange={mockOnChange} />);

    fireEvent.click(screen.getByText('Spanish'));
    expect(screen.getByPlaceholderText('Title in Spanish')).toBeInTheDocument();

    fireEvent.click(screen.getByText('French'));
    expect(screen.getByPlaceholderText('Title in French')).toBeInTheDocument();
  });

  it('displays existing translation values', () => {
    const value = {
      ar: { title: 'رحلة الأهرامات', description: 'وصف عربي' },
    };
    render(<TranslationEditor fields={simpleFields} value={value} onChange={mockOnChange} />);

    expect(screen.getByDisplayValue('رحلة الأهرامات')).toBeInTheDocument();
    expect(screen.getByDisplayValue('وصف عربي')).toBeInTheDocument();
  });

  it('calls onChange when user types in a field', () => {
    render(<TranslationEditor fields={simpleFields} value={{}} onChange={mockOnChange} />);

    const titleInput = screen.getByPlaceholderText('Title in Arabic');
    fireEvent.change(titleInput, { target: { value: 'عنوان جديد' } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const updated = mockOnChange.mock.calls[0][0];
    expect(updated.ar.title).toBe('عنوان جديد');
  });

  it('shows field count badge for locales with content', () => {
    const value = {
      ar: { title: 'عربي', description: 'وصف' },
      es: { title: 'Español' },
    };
    render(<TranslationEditor fields={simpleFields} value={value} onChange={mockOnChange} />);

    // Arabic tab should show badge with count 2
    const badges = screen.getAllByText('2');
    expect(badges.length).toBeGreaterThanOrEqual(1);

    // Spanish tab should show badge with count 1
    const badge1 = screen.getAllByText('1');
    expect(badge1.length).toBeGreaterThanOrEqual(1);
  });

  it('supports adding array items', () => {
    render(<TranslationEditor fields={simpleFields} value={{}} onChange={mockOnChange} />);

    // Find the "Add" button for highlights
    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]); // Click the first Add button

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('applies RTL direction for Arabic locale', () => {
    render(<TranslationEditor fields={simpleFields} value={{}} onChange={mockOnChange} />);

    // Arabic is the default active tab, so fields container should have dir="rtl"
    const container = screen.getByPlaceholderText('Title in Arabic').closest('[dir]');
    expect(container).toHaveAttribute('dir', 'rtl');
  });

  it('applies LTR direction for non-Arabic locales', () => {
    render(<TranslationEditor fields={simpleFields} value={{}} onChange={mockOnChange} />);

    fireEvent.click(screen.getByText('Spanish'));
    const container = screen.getByPlaceholderText('Title in Spanish').closest('[dir]');
    expect(container).toHaveAttribute('dir', 'ltr');
  });
});

// ════════════════════════════════════════════════════════════════
// SECTION F: End-to-end flow smoke (mocked)
// ════════════════════════════════════════════════════════════════

describe('Smoke: Full translation flow (mocked E2E)', () => {
  it('admin triggers tour translation → OpenAI called → DB updated → success response', async () => {
    // 1. Set up: tour exists in DB
    mockTourFindById.mockResolvedValue({
      _id: 'tour-abc',
      title: 'Pyramids Tour',
      description: 'Explore the Great Pyramids',
      highlights: ['Ancient wonders', 'Guided tour'],
    });

    // 2. OpenAI returns translations
    mockOpenAISuccess({
      ar: { title: 'جولة الأهرامات', description: 'استكشف الأهرامات العظيمة', highlights: ['عجائب قديمة', 'جولة مع مرشد'] },
      es: { title: 'Tour Pirámides', description: 'Explora las Pirámides', highlights: ['Maravillas antiguas', 'Tour guiado'] },
      fr: { title: 'Visite Pyramides', description: 'Explorez les Pyramides', highlights: ['Merveilles antiques', 'Visite guidée'] },
      de: { title: 'Pyramidentour', description: 'Erkunden Sie die Pyramiden', highlights: ['Antike Wunder', 'Geführte Tour'] },
    });

    // 3. Admin makes the API call
    const res = await POST(makeRequest({ modelType: 'tour', id: 'tour-abc' }));
    const data = await res.json();

    // 4. Assertions
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('tour');
    expect(data.message).toContain('tour-abc');

    // 5. Verify OpenAI was called with the right model
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].model).toBe('gpt-4o-mini');

    // 6. Verify DB was updated with translations
    expect(mockTourUpdate).toHaveBeenCalledWith(
      'tour-abc',
      expect.objectContaining({
        $set: expect.objectContaining({
          translations: expect.objectContaining({
            ar: expect.objectContaining({ title: 'جولة الأهرامات' }),
            es: expect.objectContaining({ title: 'Tour Pirámides' }),
          }),
        }),
      })
    );
  });

  it('gracefully handles OpenAI being unavailable', async () => {
    mockTourFindById.mockResolvedValue({
      _id: 'tour-xyz',
      title: 'Nile Cruise',
      description: 'Scenic river cruise',
    });
    mockCreate.mockRejectedValue(new Error('Service unavailable'));

    // Should still return 200 (translations just won't be generated)
    const res = await POST(makeRequest({ modelType: 'tour', id: 'tour-xyz' }));
    expect(res.status).toBe(200);

    // DB should NOT be updated (no translations to save)
    expect(mockTourUpdate).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// SECTION G: Per-locale translation (used by streaming endpoint)
// ════════════════════════════════════════════════════════════════

describe('Smoke: translateEntityFieldsForLocale (streaming)', () => {
  it('translates fields for a single locale', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ title: 'رحلة الأهرامات', description: 'وصف بالعربية' }) } }],
    });

    const result = await translateEntityFieldsForLocale(
      { title: 'Pyramids Tour', description: 'A great tour' },
      tourTranslationFields,
      'tour',
      'ar'
    );

    expect(result.title).toBe('رحلة الأهرامات');
    expect(result.description).toBe('وصف بالعربية');
  });

  it('sends locale-specific prompt to OpenAI', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ title: 'Visite' }) } }],
    });

    await translateEntityFieldsForLocale(
      { title: 'Tour' },
      tourTranslationFields,
      'tour',
      'fr'
    );

    const userMessage = mockCreate.mock.calls[0][0].messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).toContain('French');
    expect(userMessage.content).toContain('fr');
    // Should NOT mention other locales
    expect(userMessage.content).not.toContain('German');
  });

  it('returns empty object on failure (graceful)', async () => {
    mockCreate.mockRejectedValue(new Error('Rate limit'));

    const result = await translateEntityFieldsForLocale(
      { title: 'Test' },
      tourTranslationFields,
      'tour',
      'es'
    );

    expect(result).toEqual({});
  });

  it('skips empty fields', async () => {
    const result = await translateEntityFieldsForLocale(
      {},
      tourTranslationFields,
      'tour',
      'de'
    );

    expect(result).toEqual({});
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
