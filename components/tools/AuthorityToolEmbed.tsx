'use client';

import { ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { OfficialToolId } from '@/lib/tools/catalog';

const DEFAULT_HEIGHT = 760;
const MIN_HEIGHT = 420;
const MAX_HEIGHT = 5_000;
const LOAD_TIMEOUT_MS = 12_000;

export default function AuthorityToolEmbed({
  src,
  tool,
  title,
}: {
  src: string;
  tool: OfficialToolId;
  title: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const sourceOrigin = useMemo(() => new URL(src).origin, [src]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== sourceOrigin ||
        event.source !== frameRef.current?.contentWindow ||
        !event.data ||
        event.data.type !== 'foxes-tools:resize' ||
        event.data.tool !== tool
      ) {
        return;
      }

      const nextHeight = Number(event.data.height);
      if (!Number.isFinite(nextHeight)) return;
      setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, nextHeight)));
      // The signed resize message is the embed readiness handshake. An iframe
      // load event alone can also fire for a browser error document or CSP block.
      setReady(true);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sourceOrigin, tool]);

  useEffect(() => {
    if (ready || failed) return;

    const timeout = window.setTimeout(() => setFailed(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [failed, ready]);

  if (failed) {
    return (
      <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-amber-950">
        <h2 className="text-lg font-bold">The embedded tool could not load</h2>
        <p className="mt-2 text-sm leading-6">
          Check your connection, then try again. You can also open the verified tool in a separate tab.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Open tool <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div
      className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)]"
      aria-busy={!ready}
    >
      {!ready && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-x-0 top-0 z-10 flex min-h-36 items-center justify-center bg-white px-6 text-center"
        >
          <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-600">
            <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-orange-600" />
            Loading verified travel tool…
          </span>
        </div>
      )}
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        onError={() => setFailed(true)}
        className="block w-full border-0 bg-white transition-[height] duration-200"
        style={{ height }}
      />
    </div>
  );
}
