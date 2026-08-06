import { getMobileCommerceAvailability } from '@/lib/checkout/mobileCommerce';
import { handleMobileCommerceRoute } from '@/app/api/mobile/v1/commerce/routeSupport';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleMobileCommerceRoute(request, {
    action: 'mobile-commerce-availability',
    networkLimit: 180,
    subjectLimit: 90,
    operation: getMobileCommerceAvailability,
  });
}
