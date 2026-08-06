import { releaseMobileCommerceHold } from '@/lib/checkout/mobileCommerce';
import { handleMobileCommerceRoute } from '@/app/api/mobile/v1/commerce/routeSupport';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleMobileCommerceRoute(request, {
    action: 'mobile-commerce-release',
    networkLimit: 60,
    operation: releaseMobileCommerceHold,
  });
}
