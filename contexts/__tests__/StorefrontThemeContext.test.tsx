import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StorefrontThemeProvider } from '@/contexts/StorefrontThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
  resolveStorefrontTheme,
  STOREFRONT_THEME_STORAGE_KEY,
} from '@/lib/storefrontTheme';

describe('storefront theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    (window.matchMedia as jest.Mock).mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    document.documentElement.lang = 'en';
    delete document.documentElement.dataset.storefrontTheme;
  });

  it('uses a saved choice before the operating-system preference', () => {
    expect(resolveStorefrontTheme('light', true)).toBe('light');
    expect(resolveStorefrontTheme('dark', false)).toBe('dark');
    expect(resolveStorefrontTheme(null, true)).toBe('dark');
  });

  it('starts from the system preference and persists an explicit toggle', async () => {
    render(
      <StorefrontThemeProvider>
        <ThemeToggle />
      </StorefrontThemeProvider>,
    );

    const toggle = await screen.findByRole('button', { name: 'Switch to light mode' });
    expect(document.documentElement.dataset.storefrontTheme).toBe('dark');

    fireEvent.click(toggle);

    await waitFor(() => expect(document.documentElement.dataset.storefrontTheme).toBe('light'));
    expect(window.localStorage.getItem(STOREFRONT_THEME_STORAGE_KEY)).toBe('light');
    expect(toggle).toHaveAccessibleName('Switch to dark mode');
  });
});
