'use client';

import { useEffect } from 'react';

interface FoxesVoiceWidgetProps {
  apiUrl: string;
  widgetId: string;
}

const FALLBACK_API_URL = 'https://foxes-ai-voice.netlify.app';
const SCRIPT_ID = 'foxes-voice-widget-script';
const SCRIPT_VERSION = '2026-03-07';

export default function FoxesVoiceWidget({ apiUrl, widgetId }: FoxesVoiceWidgetProps) {
  useEffect(() => {
    if (!widgetId) return;
    let cancelled = false;

    const initWidget = (baseUrl: string) => {
      if (typeof (window as any).foxes === 'function') {
        (window as any).foxes('destroy');
        (window as any).foxes('init', {
          widgetId,
          baseUrl,
          position: 'bottom-right',
          primaryColor: '#0ea5e9',
        });
      }
    };

    const loadScript = (baseUrl: string) =>
      new Promise<void>((resolve, reject) => {
        const existing = document.getElementById(SCRIPT_ID);
        if (existing) existing.remove();

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = `${baseUrl}/widget.js?v=${SCRIPT_VERSION}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load widget from ${baseUrl}`));
        document.body.appendChild(script);
      });

    const canReach = async (url: string) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 1800);
      try {
        const res = await fetch(`${url}/api/widget/${encodeURIComponent(widgetId)}`, {
          method: 'GET',
          headers: { 'X-Widget-ID': widgetId },
          signal: controller.signal,
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const mount = async () => {
      let resolvedUrl = apiUrl;
      if (apiUrl !== FALLBACK_API_URL) {
        const ok = await canReach(apiUrl);
        if (!ok) resolvedUrl = FALLBACK_API_URL;
      }
      if (cancelled) return;

      if (document.getElementById(SCRIPT_ID) && typeof (window as any).foxes === 'function') {
        initWidget(resolvedUrl);
        return;
      }

      try {
        await loadScript(resolvedUrl);
        if (!cancelled) initWidget(resolvedUrl);
      } catch {
        if (resolvedUrl === FALLBACK_API_URL) return;
        try {
          await loadScript(FALLBACK_API_URL);
          if (!cancelled) initWidget(FALLBACK_API_URL);
        } catch {}
      }
    };

    mount();

    return () => {
      cancelled = true;
      if (typeof (window as any).foxes === 'function') {
        (window as any).foxes('destroy');
      }
    };
  }, [apiUrl, widgetId]);

  return null;
}
