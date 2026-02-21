import { translateEntityFields } from '../autoTranslate';
import { tourTranslationFields, destinationTranslationFields, categoryTranslationFields } from '../translationFields';

// Mock the OpenAI client
const mockCreate = jest.fn();
jest.mock('@/lib/openai', () => ({
  getOpenAIClient: jest.fn(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

// Mock dbConnect and models (needed by convenience helpers)
jest.mock('@/lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('@/lib/models/Tour', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('@/lib/models/Destination', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('@/lib/models/Category', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

describe('translateEntityFields', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('calls OpenAI and returns parsed translations for all locales', async () => {
    const mockResponse = {
      ar: { title: 'جولة الأهرام', description: 'وصف عربي' },
      es: { title: 'Tour de Pirámides', description: 'Descripción en español' },
      fr: { title: 'Visite des Pyramides', description: 'Description en français' },
      de: { title: 'Pyramiden-Tour', description: 'Beschreibung auf Deutsch' },
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResponse) } }],
    });

    const fields = { title: 'Pyramid Tour', description: 'An English description' };
    const result = await translateEntityFields(fields, tourTranslationFields, 'tour');

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })
    );

    expect(result).toHaveProperty('ar');
    expect(result).toHaveProperty('es');
    expect(result).toHaveProperty('fr');
    expect(result).toHaveProperty('de');
    expect(result.ar.title).toBe('جولة الأهرام');
    expect(result.es.description).toBe('Descripción en español');
  });

  it('returns empty object when all fields are empty', async () => {
    const fields = { title: '', description: '   ' };
    const result = await translateEntityFields(fields, tourTranslationFields, 'tour');

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('skips fields not present in the field definitions', async () => {
    const mockResponse = {
      ar: { title: 'عنوان' },
      es: { title: 'Título' },
      fr: { title: 'Titre' },
      de: { title: 'Titel' },
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResponse) } }],
    });

    const fields = { title: 'A Title' };
    const result = await translateEntityFields(fields, tourTranslationFields, 'tour');

    expect(result.ar.title).toBe('عنوان');
  });

  it('handles array fields correctly', async () => {
    const mockResponse = {
      ar: { highlights: ['ميزة 1', 'ميزة 2'] },
      es: { highlights: ['Característica 1', 'Característica 2'] },
      fr: { highlights: ['Caractéristique 1', 'Caractéristique 2'] },
      de: { highlights: ['Merkmal 1', 'Merkmal 2'] },
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResponse) } }],
    });

    const fields = { highlights: ['Feature 1', 'Feature 2'] };
    const result = await translateEntityFields(fields, tourTranslationFields, 'tour');

    expect(result.ar.highlights).toEqual(['ميزة 1', 'ميزة 2']);
    expect(result.es.highlights).toEqual(['Característica 1', 'Característica 2']);
  });

  it('handles OpenAI API errors gracefully', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

    const fields = { title: 'Some Tour' };
    const result = await translateEntityFields(fields, tourTranslationFields, 'tour');

    expect(result).toEqual({});
  });

  it('handles malformed JSON response gracefully', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not valid json' } }],
    });

    const fields = { title: 'Some Tour' };
    const result = await translateEntityFields(fields, tourTranslationFields, 'tour');

    expect(result).toEqual({});
  });

  it('handles empty response from OpenAI', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const fields = { title: 'Some Tour' };
    const result = await translateEntityFields(fields, tourTranslationFields, 'tour');

    expect(result).toEqual({});
  });

  it('filters out invalid locale keys from response', async () => {
    const mockResponse = {
      ar: { name: 'القاهرة' },
      es: { name: 'El Cairo' },
      fr: { name: 'Le Caire' },
      de: { name: 'Kairo' },
      xx: { name: 'Invalid locale' }, // should be filtered
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResponse) } }],
    });

    const fields = { name: 'Cairo' };
    const result = await translateEntityFields(fields, destinationTranslationFields, 'destination');

    expect(result).not.toHaveProperty('xx');
    expect(Object.keys(result).sort()).toEqual(['ar', 'de', 'es', 'fr']);
  });

  it('works with destination fields', async () => {
    const mockResponse = {
      ar: { name: 'القاهرة', country: 'مصر' },
      es: { name: 'El Cairo', country: 'Egipto' },
      fr: { name: 'Le Caire', country: 'Égypte' },
      de: { name: 'Kairo', country: 'Ägypten' },
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResponse) } }],
    });

    const fields = { name: 'Cairo', country: 'Egypt' };
    const result = await translateEntityFields(fields, destinationTranslationFields, 'destination');

    expect(result.ar.name).toBe('القاهرة');
    expect(result.ar.country).toBe('مصر');
    expect(result.de.country).toBe('Ägypten');
  });

  it('works with category fields', async () => {
    const mockResponse = {
      ar: { name: 'جولات المغامرات' },
      es: { name: 'Tours de Aventura' },
      fr: { name: "Tours d'Aventure" },
      de: { name: 'Abenteuertouren' },
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockResponse) } }],
    });

    const fields = { name: 'Adventure Tours' };
    const result = await translateEntityFields(fields, categoryTranslationFields, 'category');

    expect(result.ar.name).toBe('جولات المغامرات');
    expect(result.fr.name).toBe("Tours d'Aventure");
  });

  it('includes entity context in the prompt', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{}' } }],
    });

    const fields = { name: 'Test' };
    await translateEntityFields(fields, categoryTranslationFields, 'category');

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).toContain('category');
  });
});

describe('autoTranslateTour', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    const Tour = jest.requireMock('@/lib/models/Tour');
    Tour.findById.mockReset();
    Tour.findByIdAndUpdate.mockReset();
  });

  it('fetches tour, translates, and saves translations back', async () => {
    const Tour = jest.requireMock('@/lib/models/Tour');
    const mockTour = {
      _id: 'tour123',
      title: 'Pyramid Tour',
      description: 'Visit pyramids',
    };

    Tour.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockTour) });
    Tour.findByIdAndUpdate.mockResolvedValue({});

    const mockTranslations = {
      ar: { title: 'جولة الأهرام', description: 'زيارة الأهرام' },
      es: { title: 'Tour de Pirámides', description: 'Visitar pirámides' },
      fr: { title: 'Tour des Pyramides', description: 'Visiter les pyramides' },
      de: { title: 'Pyramiden-Tour', description: 'Pyramiden besuchen' },
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockTranslations) } }],
    });

    const { autoTranslateTour } = await import('../autoTranslate');
    await autoTranslateTour('tour123');

    expect(Tour.findById).toHaveBeenCalledWith('tour123');
    expect(Tour.findByIdAndUpdate).toHaveBeenCalledWith('tour123', {
      $set: { translations: mockTranslations },
    });
  });

  it('does nothing when tour is not found', async () => {
    const Tour = jest.requireMock('@/lib/models/Tour');
    Tour.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const { autoTranslateTour } = await import('../autoTranslate');
    await autoTranslateTour('nonexistent');

    expect(Tour.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('autoTranslateDestination', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('fetches destination, translates, and saves translations back', async () => {
    const Destination = jest.requireMock('@/lib/models/Destination');
    const mockDest = {
      _id: 'dest123',
      name: 'Cairo',
      country: 'Egypt',
      description: 'Capital of Egypt',
    };

    Destination.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockDest) });
    Destination.findByIdAndUpdate.mockResolvedValue({});

    const mockTranslations = {
      ar: { name: 'القاهرة', country: 'مصر', description: 'عاصمة مصر' },
      es: { name: 'El Cairo', country: 'Egipto', description: 'Capital de Egipto' },
      fr: { name: 'Le Caire', country: 'Égypte', description: "Capitale de l'Égypte" },
      de: { name: 'Kairo', country: 'Ägypten', description: 'Hauptstadt von Ägypten' },
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockTranslations) } }],
    });

    const { autoTranslateDestination } = await import('../autoTranslate');
    await autoTranslateDestination('dest123');

    expect(Destination.findById).toHaveBeenCalledWith('dest123');
    expect(Destination.findByIdAndUpdate).toHaveBeenCalledWith('dest123', {
      $set: { translations: mockTranslations },
    });
  });
});

describe('autoTranslateCategory', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('fetches category, translates, and saves translations back', async () => {
    const Category = jest.requireMock('@/lib/models/Category');
    const mockCat = {
      _id: 'cat123',
      name: 'Adventure Tours',
      description: 'Exciting adventure experiences',
    };

    Category.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockCat) });
    Category.findByIdAndUpdate.mockResolvedValue({});

    const mockTranslations = {
      ar: { name: 'جولات المغامرات', description: 'تجارب مغامرات مثيرة' },
      es: { name: 'Tours de Aventura', description: 'Experiencias de aventura emocionantes' },
      fr: { name: "Tours d'Aventure", description: "Expériences d'aventure passionnantes" },
      de: { name: 'Abenteuertouren', description: 'Aufregende Abenteuererlebnisse' },
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockTranslations) } }],
    });

    const { autoTranslateCategory } = await import('../autoTranslate');
    await autoTranslateCategory('cat123');

    expect(Category.findById).toHaveBeenCalledWith('cat123');
    expect(Category.findByIdAndUpdate).toHaveBeenCalledWith('cat123', {
      $set: { translations: mockTranslations },
    });
  });
});
