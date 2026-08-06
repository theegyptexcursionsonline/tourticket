import { createMobileCommerceHold } from '@/lib/checkout/mobileCommerce';
import { handleMobileCommerceRoute } from '@/app/api/mobile/v1/commerce/routeSupport';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleMobileCommerceRoute(request, {
    action: 'mobile-commerce-hold',
    networkLimit: 30,
    subjectLimit: 12,
    successStatus: 201,
    operation: createMobileCommerceHold,
  });
}
