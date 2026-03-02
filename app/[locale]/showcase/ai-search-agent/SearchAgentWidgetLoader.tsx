'use client';

import { useEffect } from 'react';

interface SearchAgentWidgetLoaderProps {
  widgetConfig: {
    apiUrl: string;
    widgetId: string;
  };
}

export default function SearchAgentWidgetLoader({ widgetConfig }: SearchAgentWidgetLoaderProps) {
  const widgetScriptVersion = '2026-03-02-search-listing-embed-1';

  useEffect(() => {
    if (!widgetConfig.widgetId) return;

    const scriptId = 'foxes-search-widget-script';
    const existingScript = document.getElementById(scriptId);
    if (existingScript) existingScript.remove();

    const previousWidgetRoot = document.getElementById('foxes-widget-container');
    if (previousWidgetRoot) previousWidgetRoot.remove();

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${widgetConfig.apiUrl}/widget/foxes-widget.js?v=${widgetScriptVersion}`;
    script.async = true;
    script.setAttribute('data-api-key', widgetConfig.widgetId);
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-accent', '#7c3aed');
    script.setAttribute('data-agent-name', 'Travel Concierge');
    script.setAttribute('data-greeting', 'Hi! Ask me anything about tours, activities, or recommendations.');
    script.setAttribute('data-track-events', 'true');

    document.body.appendChild(script);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
      const widgetRoot = document.getElementById('foxes-widget-container');
      if (widgetRoot) widgetRoot.remove();
    };
  }, [widgetConfig.apiUrl, widgetConfig.widgetId, widgetScriptVersion]);

  return null;
}
