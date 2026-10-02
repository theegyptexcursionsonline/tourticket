import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { discountTenantFilter, MAIN_DISCOUNT_TENANT } from '@/lib/discounts/tenantScope';
import { DiscountInputError, discountMutationError, parseDiscountInput } from '@/lib/discounts/adminInput';

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;
  
  await dbConnect();

  try {
    const discounts = await Discount.find(discountTenantFilter()).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: discounts });
  } catch (error) {
    console.error('Failed to fetch discounts:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

async function POSTHandler(request: NextRequest) {
  // Verify admin authentication
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const body = await request.json();
    const values = parseDiscountInput(body);
    if (body.tenantId !== undefined && body.tenantId !== MAIN_DISCOUNT_TENANT) {
      throw new DiscountInputError('Discounts can only be created for this brand.');
    }
    if (await Discount.exists({ ...discountTenantFilter(), code: values.code })) {
      return discountMutationError({ code: 11000 });
    }
    const newDiscount = await Discount.create({ ...values, tenantId: MAIN_DISCOUNT_TENANT });
    return NextResponse.json({ success: true, data: newDiscount }, { status: 201 });
  } catch (error) {
    return discountMutationError(error);
  }
}

export const POST = withAdminAudit(POSTHandler);
