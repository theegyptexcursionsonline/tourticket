import { roundMoney } from '@/lib/checkout/cartTotals';
import { localDepartureToUtc } from '@/lib/revenue/departureSchedule';

export const CANCELLATION_POLICY_VERSION = 'eeo-cancellation-v1-provisional';
export const CANCELLATION_POLICY_SHORT = '100% refund 7+ days before departure; 50% refund 3–7 days before; no refund under 3 days.';
export const CANCELLATION_POLICY_SUMMARY = `Self-service cancellation closes 24 hours before departure. ${CANCELLATION_POLICY_SHORT}`;

export function calculateCancellationPolicy(input: {
  dateString: string;
  time: string;
  totalPrice: number;
  now?: Date;
}) {
  const departure = new Date(localDepartureToUtc(input.dateString, input.time));
  const now = input.now || new Date();
  const millisecondsUntilDeparture = departure.getTime() - now.getTime();
  const hoursUntilDeparture = millisecondsUntilDeparture / 3_600_000;
  const refundPercentage = millisecondsUntilDeparture >= 7 * 86_400_000
    ? 100
    : millisecondsUntilDeparture >= 3 * 86_400_000
      ? 50
      : 0;
  return {
    policyVersion: CANCELLATION_POLICY_VERSION,
    departureAtUtc: departure.toISOString(),
    hoursUntilDeparture,
    refundPercentage,
    refundAmount: roundMoney(Math.max(0, Number(input.totalPrice || 0)) * refundPercentage / 100),
    customerCancellationAllowed: hoursUntilDeparture >= 24,
  };
}
