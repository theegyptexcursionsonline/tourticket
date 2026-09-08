import type { NextRequest } from 'next/server';
jest.mock('next/server', () => ({ NextResponse: class {
  constructor(public body: unknown, public status = 200) {}
  static json(body: unknown, init?: { status: number }) { return new this(body, init?.status || 200); }
  async json() { return this.body; }
} }));
const save = jest.fn();
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: async () => ({ role: 'admin' }) }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { exists: async () => true, findOne: () => ({ select: async () => ({ bookingOptions: [{ label: 'Legacy' }], save }) }) } }));
jest.mock('@/lib/models/Availability', () => ({ __esModule: true, default: { find: () => ({ populate: () => ({ sort: () => ({ lean: async () => [] }) }) }) } }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: { find: () => ({ select: () => ({ lean: async () => [{ optionIds: ['option-0'], startDate: '2026-09-10', endDate: '2026-09-10' }] }) }) } }));
import { GET } from '../route';
it('reads the admin calendar without persisting or changing legacy option identities', async () => {
  const response = await GET({ url: 'https://site.invalid/api/admin/availability?tourId=69861281f1598842cc1e5193&month=9&year=2026' } as NextRequest);
  expect(response.status).toBe(200);
  expect(save).not.toHaveBeenCalled();
  expect(JSON.stringify(await response.json())).toContain('full');
});
