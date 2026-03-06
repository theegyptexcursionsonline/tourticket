/**
 * Foxes AI Widget Configuration for Showcase Pages
 *
 * These values are public (not secrets). They can be overridden via
 * NEXT_PUBLIC_* env vars for local testing or staging.
 */
const defaultVoiceApiUrl = 'https://foxes-ai-voice.netlify.app';

export const FOXES_SEARCH_CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_FOXES_SEARCH_API_URL || 'https://ai-search-agent.netlify.app',
  widgetId:
    process.env.NEXT_PUBLIC_FOXES_SEARCH_WIDGET_ID ||
    process.env.NEXT_PUBLIC_FOXES_SEARCH_API_KEY ||
    'wgt_CXtars0OalnORU0z2rgcvw',
};

export const FOXES_VOICE_CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_FOXES_VOICE_API_URL || defaultVoiceApiUrl,
  widgetId: process.env.NEXT_PUBLIC_FOXES_VOICE_WIDGET_ID || '694c1a7a27cc23227da2ccdb',
};
