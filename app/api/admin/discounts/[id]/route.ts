import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { discountTenantFilter, MAIN_DISCOUNT_TENANT } from '@/lib/discounts/tenantScope';
import { DiscountInputError, discountMutationError, parseDiscountInput } from '@/lib/discounts/adminInput';

async function PUTHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Verify admin authentication
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new DiscountInputError('Choose a valid discount.');
    const body = await request.json();
    const values = parseDiscountInput(body, true);
    if (body.tenantId !== undefined && body.tenantId !== MAIN_DISCOUNT_TENANT) throw new DiscountInputError('A discount cannot be moved to another brand.');
    const filter = { _id: id, ...discountTenantFilter() };
    const existing = await Discount.findOne(filter).lean();
    if (!existing) return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    if ((values.discountType ?? existing.discountType) === 'percentage' && (values.value ?? existing.value) > 100) throw new DiscountInputError('A percentage discount cannot exceed 100%.');
    if (values.code && values.code !== existing.code && await Discount.exists({ ...discountTenantFilter(), code: values.code, _id: { $ne: id } })) return discountMutationError({ code: 11000 });
    const updatedDiscount = await Discount.findOneAndUpdate(filter, { $set: values }, {
      new: true,
      runValidators: true,
    });

    if (!updatedDiscount) {
      return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedDiscount });
  } catch (error) {
    return discountMutationError(error);
  }
}

async function DELETEHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Verify admin authentication
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new DiscountInputError('Choose a valid discount.');
    const deletedDiscount = await Discount.findOneAndDelete({ _id: id, ...discountTenantFilter() });

    if (!deletedDiscount) {
      return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return discountMutationError(error);
  }
}

export const PUT = withAdminAudit(PUTHandler);
export const DELETE = withAdminAudit(DELETEHandler);
