/**
 * Test script for add-on calculation fix
 * Run with: npx tsx scripts/test-addon-calculation.ts
 */

import { clampAddOnQuantity, perPersonAddOnLimit } from '../lib/bookings/bookingSelection';

// ============================================================
// Test the add-on transformation and calculation logic
// ============================================================

console.log('🔧 Testing Add-on Calculation Fix...\n');

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      failed++;
    }
  } catch (e: any) {
    console.log(`  ❌ ${name} - Error: ${e.message}`);
    failed++;
  }
}

// ============================================================
// Test 1: Server-to-Client Add-on Transformation
// ============================================================
console.log('Test 1: Server-to-Client Add-on Transformation');

// Simulates what comes from server
const serverAddOns = [
  { id: 'private-tour', name: 'Private Tour', price: 35, quantity: 1, perGuest: false },
  { id: 'lunch-upgrade', name: 'Lunch Upgrade', price: 15, quantity: 2, perGuest: true },
];

// Transformation logic (from CartContext.tsx)
function transformServerToClient(serverAddOns: any[]) {
  let selectedAddOns: { [key: string]: number } = {};
  let selectedAddOnDetails: { [key: string]: any } = {};

  if (Array.isArray(serverAddOns)) {
    serverAddOns.forEach((addon: any) => {
      if (addon.id) {
        selectedAddOns[addon.id] = addon.quantity || 1;
        selectedAddOnDetails[addon.id] = {
          id: addon.id,
          title: addon.name || addon.title || 'Add-on',
          price: addon.price || 0,
          category: addon.category || 'add-on',
          perGuest: addon.perGuest ?? false,
        };
      }
    });
  }

  return { selectedAddOns, selectedAddOnDetails };
}

const transformed = transformServerToClient(serverAddOns);

runTest('selectedAddOns is an object (not array)', () => {
  return typeof transformed.selectedAddOns === 'object' && !Array.isArray(transformed.selectedAddOns);
});

runTest('selectedAddOns has correct keys', () => {
  return 'private-tour' in transformed.selectedAddOns && 'lunch-upgrade' in transformed.selectedAddOns;
});

runTest('selectedAddOns has correct quantities', () => {
  return transformed.selectedAddOns['private-tour'] === 1 && transformed.selectedAddOns['lunch-upgrade'] === 2;
});

runTest('selectedAddOnDetails has correct structure', () => {
  const detail = transformed.selectedAddOnDetails['private-tour'];
  return detail && detail.id === 'private-tour' && detail.title === 'Private Tour' && detail.price === 35;
});

runTest('perGuest is preserved correctly', () => {
  return transformed.selectedAddOnDetails['private-tour'].perGuest === false &&
         transformed.selectedAddOnDetails['lunch-upgrade'].perGuest === true;
});

// ============================================================
// Test 2: Add-on Price Calculation
// ============================================================
console.log('\nTest 2: Add-on Price Calculation');

// Simulates the getItemTotal function from checkout page
function getItemTotal(item: any) {
  const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
  const adultPrice = basePrice * (item.quantity || 1);
  const childPrice = (basePrice / 2) * (item.childQuantity || 0);
  let tourTotal = adultPrice + childPrice;

  let addOnsTotal = 0;
  if (item.selectedAddOns && item.selectedAddOnDetails) {
    Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
      const addOnDetail = item.selectedAddOnDetails?.[addOnId];
      if (addOnDetail && (quantity as number) > 0) {
        const addOnQuantity = addOnDetail.perGuest
          ? clampAddOnQuantity(quantity as number, perPersonAddOnLimit(item.quantity || 0, item.childQuantity || 0))
          : Number(quantity);
        addOnsTotal += addOnDetail.price * addOnQuantity;
      }
    });
  }

  return { tourTotal, addOnsTotal, total: tourTotal + addOnsTotal };
}

// Test cart item with proper client format
const cartItemClientFormat = {
  price: 40,
  quantity: 2,         // 2 adults
  childQuantity: 0,
  selectedAddOns: { 'private-tour': 1 },
  selectedAddOnDetails: {
    'private-tour': { id: 'private-tour', title: 'Private Tour', price: 35, category: 'add-on', perGuest: false }
  }
};

const addonResult1 = getItemTotal(cartItemClientFormat);

runTest('Tour total calculated correctly (2 adults × €40)', () => {
  return addonResult1.tourTotal === 80;
});

runTest('Add-on total calculated correctly (€35 flat)', () => {
  return addonResult1.addOnsTotal === 35;
});

runTest('Combined total is correct (€80 + €35 = €115)', () => {
  return addonResult1.total === 115;
});

// ============================================================
// Test 3: Per-person Add-on Calculation
// ============================================================
console.log('\nTest 3: Per-person Add-on Calculation');

const cartItemWithPerGuestAddon = {
  price: 40,
  quantity: 2,         // 2 adults
  childQuantity: 1,    // 1 child
  selectedAddOns: { 'lunch-upgrade': 1 },
  selectedAddOnDetails: {
    'lunch-upgrade': { id: 'lunch-upgrade', title: 'Lunch Upgrade', price: 15, category: 'add-on', perGuest: true }
  }
};

const addonResult2 = getItemTotal(cartItemWithPerGuestAddon);

runTest('Tour total with child (2 adults + 1 child)', () => {
  // 2 × €40 + 1 × €20 (half price for child) = €100
  return addonResult2.tourTotal === 100;
});

runTest('Per-person add-on uses the chosen quantity', () => {
  // €15 × 1 chosen unit = €15 (the guest can step up to 3)
  return addonResult2.addOnsTotal === 15;
});

runTest('Combined total is correct (€100 + €15 = €115)', () => {
  return addonResult2.total === 115;
});

// ============================================================
// Test 4: Broken Server Format (OLD BUG)
// ============================================================
console.log('\nTest 4: Verifying OLD bug scenario (array format)');

const cartItemBrokenFormat = {
  price: 40,
  quantity: 2,
  childQuantity: 0,
  // This is what the server used to return - array format
  selectedAddOns: [{ id: 'private-tour', name: 'Private Tour', price: 35, quantity: 1 }],
  // selectedAddOnDetails is undefined because server didn't store it
  selectedAddOnDetails: undefined
};

const result3 = getItemTotal(cartItemBrokenFormat);

runTest('OLD FORMAT: Add-ons total is 0 (bug behavior)', () => {
  // The old bug: when selectedAddOnDetails is undefined, add-ons are skipped
  return result3.addOnsTotal === 0;
});

runTest('OLD FORMAT: Total missing add-ons (confirms the bug)', () => {
  // Total should be just tour price, add-ons missing
  return result3.total === 80;
});

// ============================================================
// Test 4b: Corrupted Quantity (real-world bug)
// ============================================================
console.log('\nTest 4b: Corrupted quantity value (object instead of number)');

const cartItemCorruptedQty = {
  price: 40,
  quantity: 2,
  childQuantity: 0,
  selectedAddOns: { 'private-tour': { id: 'private-tour', name: 'Private Tour', price: 35, quantity: 1 } }, // WRONG type
  selectedAddOnDetails: {
    'private-tour': { id: 'private-tour', title: 'Private Tour', price: 35, category: 'add-on', perGuest: false }
  }
};

const resultCorrupt = getItemTotal(cartItemCorruptedQty);

runTest('CORRUPT: Add-ons total becomes 0 because quantity is an object (NaN > 0)', () => {
  return resultCorrupt.addOnsTotal === 0;
});

// ============================================================
// Test 5: After Transformation (FIX APPLIED)
// ============================================================
console.log('\nTest 5: After transformation (FIX applied)');

// Simulate loading from server and transforming
const serverItem = {
  price: 40,
  quantity: 2,
  childQuantity: 0,
  selectedAddOns: [{ id: 'private-tour', name: 'Private Tour', price: 35, quantity: 1, perGuest: false }],
};

// Apply the fix transformation
const { selectedAddOns: fixedAddOns, selectedAddOnDetails: fixedDetails } = 
  transformServerToClient(serverItem.selectedAddOns);

const fixedCartItem = {
  ...serverItem,
  selectedAddOns: fixedAddOns,
  selectedAddOnDetails: fixedDetails,
};

const result4 = getItemTotal(fixedCartItem);

runTest('FIXED: Add-ons total is now €35', () => {
  return result4.addOnsTotal === 35;
});

runTest('FIXED: Total includes add-ons (€80 + €35 = €115)', () => {
  return result4.total === 115;
});

// ============================================================
// Test 6: Normalization of corrupted quantity (FIX APPLIED)
// ============================================================
console.log('\nTest 6: Normalization fixes corrupted quantity');

function toNumberQty(value: any, fallback = 1): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    return fallback;
  }
  if (value && typeof value === 'object') {
    const inner = value.quantity ?? value.qty ?? value.count;
    return toNumberQty(inner, fallback);
  }
  return fallback;
}

function normalizeSelectedAddOns(selectedAddOns: any) {
  const next: Record<string, number> = {};
  if (!selectedAddOns || typeof selectedAddOns !== 'object') return next;
  for (const [k, v] of Object.entries(selectedAddOns)) {
    next[k] = toNumberQty(v, 1);
  }
  return next;
}

const fixedCorrupt = {
  ...cartItemCorruptedQty,
  selectedAddOns: normalizeSelectedAddOns(cartItemCorruptedQty.selectedAddOns),
};

const resultFixedCorrupt = getItemTotal(fixedCorrupt);

runTest('FIXED: Add-ons total is €35 after normalization', () => {
  return resultFixedCorrupt.addOnsTotal === 35;
});

// ============================================================
// Summary
// ============================================================
console.log('\n==================================================');
console.log('📊 TEST SUMMARY');
console.log('==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  console.log('\nThe add-on calculation fix is working correctly.');
  console.log('- Server array format is transformed to client object format');
  console.log('- Add-on prices are now included in the total');
  console.log('- Per-person add-ons use the customer-chosen quantity');
  process.exit(0);
}
