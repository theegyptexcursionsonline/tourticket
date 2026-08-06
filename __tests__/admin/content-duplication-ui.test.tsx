import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourActions } from '@/app/admin/tours/TourActions';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams('tab=draft'),
}));

jest.mock('@/contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({ token: 'admin-token' }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    promise: jest.fn((promise: Promise<unknown>) => promise),
  },
}));

describe('admin content duplication actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('duplicates a tour and navigates directly to the returned draft editor', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        editHref: '/admin/tours/edit/duplicate-id',
        message: 'Draft tour copy created.',
      }),
    });

    render(<TourActions tourId="source-tour" />);
    await user.click(screen.getByTitle('Actions'));
    await user.click(await screen.findByRole('menuitem', { name: 'Duplicate as draft' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/tours/source-tour/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
        },
      });
      expect(mockPush).toHaveBeenCalledWith('/admin/tours/edit/duplicate-id');
    });
  });

  it('wires every unified page kind to the safe server-side duplicate endpoint', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/admin/pages/page.tsx'), 'utf8');
    expect(source).toContain("fetch('/api/admin/pages/duplicate'");
    expect(source).toContain('JSON.stringify({ kind: row.kind, id: row.id })');
    expect(source).toContain('aria-label={`Duplicate ${row.title} as draft`}');
    expect(source).toContain('router.push(data.editHref!)');
  });
});
