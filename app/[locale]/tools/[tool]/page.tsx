import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CircleAlert, ExternalLink, ShieldCheck } from 'lucide-react';

import AuthorityToolEmbed from '@/components/tools/AuthorityToolEmbed';
import ToolIcon from '@/components/tools/ToolIcon';
import { ToolsFooter, ToolsHeader } from '@/components/tools/ToolsChrome';
import { ToolPageStructuredData } from '@/components/tools/ToolsStructuredData';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';
import { getAuthorityToolState } from '@/lib/tools/authority';
import {
  STOREFRONT_TOOL_BRAND,
  getOfficialTool,
  localizedStorefrontPath,
  localizedToolPath,
} from '@/lib/tools/catalog';

export const dynamic = 'force-dynamic';

interface ToolPageProps {
  params: Promise<{ locale: string; tool: string }>;
}

function displayDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00.000Z`));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { locale, tool: toolId } = await params;
  const tool = getOfficialTool(toolId);

  if (!tool) {
    return {
      title: 'Travel tool not found | Egypt Excursions Online',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${tool.name} — Free Egypt Travel Tool | Egypt Excursions Online`,
    description: tool.description,
    // These Authority routes remain deliberately unadvertised until the owner
    // approves the tool/domain matrix and production configuration. Static
    // legacy tool routes keep their own metadata and are unaffected.
    robots: { index: false, follow: false },
    alternates: metadataAlternates(locale, `/tools/${tool.id}`),
    openGraph: {
      title: `${tool.name} | Egypt Excursions Online`,
      description: tool.description,
      type: 'website',
      siteName: STOREFRONT_TOOL_BRAND.name,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { locale, tool: toolId } = await params;
  const tool = getOfficialTool(toolId);
  if (!tool) notFound();

  const state = await getAuthorityToolState(tool.id);
  const { name, logoUrl, accent } = STOREFRONT_TOOL_BRAND;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      {state.ok && <ToolPageStructuredData locale={locale} tool={tool} />}
      <ToolsHeader name={name} logoUrl={logoUrl} accent={accent} locale={locale} />

      <main className="flex-grow">
        <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <nav aria-label="Breadcrumb" className="mb-7">
            <Link
              href={localizedToolPath(locale)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              All travel tools
            </Link>
          </nav>

          <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${accent}14`, color: accent }}
            >
              <ToolIcon name={tool.icon} className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">{tool.category} tool</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">{tool.name}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{tool.description}</p>
            </div>
          </header>

          {state.ok ? (
            <>
              <section aria-label={`${tool.name} interactive tool`} className="mt-8 sm:mt-10">
                <AuthorityToolEmbed src={state.embedSrc} tool={tool.id} title={tool.name} />
              </section>

              <aside
                aria-label="Tool source and freshness"
                className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-950 sm:flex sm:items-start sm:justify-between sm:gap-6"
              >
                <div className="flex min-w-0 gap-3">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <h2 className="font-bold">Current maintained source</h2>
                    <p className="mt-1 text-sm leading-6">
                      Reviewed {displayDate(state.source.reviewedAt, locale)} · valid through{' '}
                      {displayDate(state.source.validUntil, locale)}
                      {state.source.confidence ? ` · ${state.source.confidence}` : ''}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-800">
                      Planning guidance only. Confirm time-sensitive details with the linked official source.
                    </p>
                  </div>
                </div>
                <a
                  href={state.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:mt-0"
                >
                  {state.source.label} <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </a>
              </aside>
            </>
          ) : (
            <section
              role="alert"
              aria-labelledby="tool-unavailable-title"
              className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-amber-950 sm:px-8"
            >
              <div className="flex items-start gap-4">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
                <div>
                  <h2 id="tool-unavailable-title" className="text-xl font-bold">This tool is temporarily unavailable</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6">
                    Its verified source connection is not ready, so no fallback estimate or travel guidance is shown.
                    Please try again later or browse the other planning tools.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={localizedToolPath(locale)}
                      className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900 focus-visible:ring-offset-2"
                    >
                      Browse all tools
                    </Link>
                    <Link
                      href={localizedStorefrontPath(locale, '/contact')}
                      className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900 focus-visible:ring-offset-2"
                    >
                      Contact us
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <ToolsFooter name={name} accent={accent} locale={locale} />
    </div>
  );
}
