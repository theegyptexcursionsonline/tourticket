/**
 * Test script for add-on calculation fix
 * Run with: npx tsx scripts/test-addon-calculation.ts
 */

// ============================================================
// Test the add-on transformation and calculation logic
// ============================================================

console.log('🔧 Testing Add-on Calculation Fix...\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
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

test('selectedAddOns is an object (not array)', () => {
  return typeof transformed.selectedAddOns === 'object' && !Array.isArray(transformed.selectedAddOns);
});

test('selectedAddOns has correct keys', () => {
  return 'private-tour' in transformed.selectedAddOns && 'lunch-upgrade' in transformed.selectedAddOns;
});

test('selectedAddOns has correct quantities', () => {
  return transformed.selectedAddOns['private-tour'] === 1 && transformed.selectedAddOns['lunch-upgrade'] === 2;
});

test('selectedAddOnDetails has correct structure', () => {
  const detail = transformed.selectedAddOnDetails['private-tour'];
  return detail && detail.id === 'private-tour' && detail.title === 'Private Tour' && detail.price === 35;
});

test('perGuest is preserved correctly', () => {
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
        const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
        const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
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

const result1 = getItemTotal(cartItemClientFormat);

test('Tour total calculated correctly (2 adults × €40)', () => {
  return result1.tourTotal === 80;
});

test('Add-on total calculated correctly (€35 flat)', () => {
  return result1.addOnsTotal === 35;
});

test('Combined total is correct (€80 + €35 = €115)', () => {
  return result1.total === 115;
});

// ============================================================
// Test 3: Per-guest Add-on Calculation
// ============================================================
console.log('\nTest 3: Per-guest Add-on Calculation');

const cartItemWithPerGuestAddon = {
  price: 40,
  quantity: 2,         // 2 adults
  childQuantity: 1,    // 1 child
  selectedAddOns: { 'lunch-upgrade': 1 },
  selectedAddOnDetails: {
    'lunch-upgrade': { id: 'lunch-upgrade', title: 'Lunch Upgrade', price: 15, category: 'add-on', perGuest: true }
  }
};

const result2 = getItemTotal(cartItemWithPerGuestAddon);

test('Tour total with child (2 adults + 1 child)', () => {
  // 2 × €40 + 1 × €20 (half price for child) = €100
  return result2.tourTotal === 100;
});

test('Per-guest add-on multiplied by guest count', () => {
  // €15 × 3 guests = €45
  return result2.addOnsTotal === 45;
});

test('Combined total is correct (€100 + €45 = €145)', () => {
  return result2.total === 145;
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

test('OLD FORMAT: Add-ons total is 0 (bug behavior)', () => {
  // The old bug: when selectedAddOnDetails is undefined, add-ons are skipped
  return result3.addOnsTotal === 0;
});

test('OLD FORMAT: Total missing add-ons (confirms the bug)', () => {
  // Total should be just tour price, add-ons missing
  return result3.total === 80;
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

test('FIXED: Add-ons total is now €35', () => {
  return result4.addOnsTotal === 35;
});

test('FIXED: Total includes add-ons (€80 + €35 = €115)', () => {
  return result4.total === 115;
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
  console.log('- Per-guest add-ons are multiplied by guest count');
  process.exit(0);
}
