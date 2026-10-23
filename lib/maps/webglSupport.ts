/**
 * MapLibre 6 renders only through WebGL2. On a browser or device without it,
 * the map constructor does not throw: it leaves a half-built map whose later
 * removal crashes. Check first, so the page can show its designed fallback
 * instead of an endless "Loading route map…".
 */
export function supportsWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
