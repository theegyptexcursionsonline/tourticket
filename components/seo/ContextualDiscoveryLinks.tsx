import Link from 'next/link';
import {
  normalizeContextualDiscoveryLinks,
  type ContextualDiscoveryLink,
} from '@/lib/seo/contextualDiscovery';

const HEADINGS: Record<string, string> = {
  en: 'Explore related topics',
  ar: 'استكشف موضوعات ذات صلة',
  de: 'Ähnliche Themen entdecken',
  es: 'Explora temas relacionados',
  fr: 'Explorer des sujets associés',
};

export default function ContextualDiscoveryLinks({
  locale,
  links,
}: {
  locale: string;
  links: readonly ContextualDiscoveryLink[];
}) {
  const visibleLinks = normalizeContextualDiscoveryLinks(links);
  if (visibleLinks.length === 0) return null;

  const heading = HEADINGS[locale] || HEADINGS.en;
  return (
    <nav aria-label={heading} className="bg-slate-50 py-8 sm:py-10">
      <div className="container mx-auto px-4">
        <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">{heading}</h2>
        <ul className="flex flex-wrap gap-3">
          {visibleLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-red-300 hover:text-red-700"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
