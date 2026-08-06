import { commitMobileCommerceHold } from '@/lib/checkout/mobileCommerce';
import {
  handleMobileCommerceRoute,
  requireMobileCommerceService,
} from '@/app/api/mobile/v1/commerce/routeSupport';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleMobileCommerceRoute(request, {
    action: 'mobile-commerce-commit',
    networkLimit: 120,
    successStatus: 200,
    authorize: requireMobileCommerceService,
    operation: commitMobileCommerceHold,
  });
}
