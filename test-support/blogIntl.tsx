// Test support: the real message catalogues behind the next-intl hooks, so a
// component test reads the words a visitor would read instead of message keys.
// Used as:  jest.mock('next-intl', () => require('@/test-support/blogIntl').realIntl(() => mockLocale));
import fs from 'node:fs';
import path from 'node:path';

export const SITE_LOCALES = ['en', 'ar', 'es', 'fr', 'de'] as const;
export type SiteLocale = (typeof SITE_LOCALES)[number];

type Messages = Record<string, unknown>;
const cache = new Map<string, Messages>();

export function messagesFor(locale: string): Messages {
  if (!cache.has(locale)) {
    const file = path.join(process.cwd(), 'messages', `${locale}.json`);
    cache.set(locale, JSON.parse(fs.readFileSync(file, 'utf8')) as Messages);
  }
  return cache.get(locale)!;
}

/** Every leaf under a namespace as `a.b.c` → text. */
export function flattenMessages(node: unknown, prefix = ''): Record<string, string> {
  if (typeof node === 'string') return { [prefix]: node };
  if (!node || typeof node !== 'object') return {};
  return Object.entries(node as Messages).reduce<Record<string, string>>((all, [key, value]) => {
    return { ...all, ...flattenMessages(value, prefix ? `${prefix}.${key}` : key) };
  }, {});
}

interface TranslatorOptions {
  locale: string;
  messages: Messages;
  namespace?: string;
  onError?: (error: Error) => void;
}

type Translator = {
  (key: string, values?: Record<string, unknown>): string;
  rich: (key: string, values?: Record<string, unknown>) => React.ReactNode;
  markup: (key: string, values?: Record<string, unknown>) => string;
};

// The message engine ships as ES modules only, which the jest runtime here
// does not transform. Node itself can load it, so it is fetched through the
// real module loader of the process instead of the jest one.
let engine: { createTranslator: (options: TranslatorOptions) => unknown } | null = null;
function messageEngine() {
  if (!engine) {
    const nodeModule = process.getBuiltinModule('node:module');
    const fromApp = nodeModule.createRequire(path.join(process.cwd(), 'package.json'));
    const fromNextIntl = nodeModule.createRequire(fromApp.resolve('next-intl'));
    engine = fromNextIntl('use-intl/core') as typeof engine;
  }
  return engine!;
}

/** A translator that throws on a missing key or a malformed message instead of printing the key. */
export function strictTranslator(locale: string, namespace?: string): Translator {
  return messageEngine().createTranslator({
    locale,
    messages: messagesFor(locale),
    namespace,
    onError: (error) => {
      throw error;
    },
  }) as Translator;
}

/** Module factory for jest.mock('next-intl', ...). */
export function realIntl(currentLocale: () => string) {
  return {
    useTranslations: (namespace?: string) => strictTranslator(currentLocale(), namespace),
    useLocale: () => currentLocale(),
    useMessages: () => messagesFor(currentLocale()),
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  };
}
