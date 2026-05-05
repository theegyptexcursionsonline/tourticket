import { shouldRenderAISearchWidgetForHost } from '../aiSearchWidgetHosts';

describe('shouldRenderAISearchWidgetForHost', () => {
  it('allows the main EEO hosts', () => {
    expect(shouldRenderAISearchWidgetForHost('egypt-excursionsonline.com')).toBe(true);
    expect(shouldRenderAISearchWidgetForHost('www.egypt-excursionsonline.com')).toBe(true);
  });

  it('allows local development hosts', () => {
    expect(shouldRenderAISearchWidgetForHost('localhost')).toBe(true);
    expect(shouldRenderAISearchWidgetForHost('localhost:3000')).toBe(true);
    expect(shouldRenderAISearchWidgetForHost('127.0.0.1')).toBe(true);
  });

  it('blocks tenant custom domains by default', () => {
    expect(shouldRenderAISearchWidgetForHost('elgounaexcursions.com')).toBe(false);
    expect(shouldRenderAISearchWidgetForHost('www.elgounaexcursions.com')).toBe(false);
  });
});
