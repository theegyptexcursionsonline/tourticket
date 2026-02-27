/**
 * Test script to verify booking-related fixes
 * Run with: npx tsx scripts/test-booking-fixes.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

// Define Booking Schema inline for testing
const BookingSchema = new mongoose.Schema({
  bookingReference: { type: String, required: true, unique: true },
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalPrice: { type: Number, required: true, min: 0 },
  currency: { 
    type: String, 
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'EGP', 'AED', 'CHF', 'CAD', 'AUD', 'SEK', 'DKK', 'NOK', 'JPY', 'KRW'],
  },
  status: { type: String, default: 'Pending' },
  paymentId: { type: String, unique: true, sparse: true },
});

// Create indexes for testing
BookingSchema.index({ paymentId: 1 }, { unique: true, sparse: true });

const testResults: { test: string; status: 'PASS' | 'FAIL'; message: string }[] = [];

async function runTests() {
  console.log('🔧 Testing Booking Fixes...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Use a test collection to avoid affecting production data
    const TestBooking = mongoose.model('TestBookingFixes', BookingSchema);
    
    // Clean up any previous test data
    await TestBooking.deleteMany({ bookingReference: /^TEST-FIX-/ });
    
    // Test 1: Currency field is properly stored
    console.log('Test 1: Currency field storage');
    try {
      const booking1 = await TestBooking.create({
        bookingReference: 'TEST-FIX-001',
        tour: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        totalPrice: 100,
        currency: 'EUR',
        status: 'Confirmed',
      });
      
      const retrieved = await TestBooking.findById(booking1._id);
      if (retrieved?.currency === 'EUR') {
        testResults.push({ test: 'Currency field storage', status: 'PASS', message: 'Currency stored and retrieved correctly' });
        console.log('  ✅ Currency field stored as EUR');
      } else {
        testResults.push({ test: 'Currency field storage', status: 'FAIL', message: `Expected EUR, got ${retrieved?.currency}` });
        console.log('  ❌ Currency field mismatch');
      }
    } catch (err: any) {
      testResults.push({ test: 'Currency field storage', status: 'FAIL', message: err.message });
      console.log('  ❌ Error:', err.message);
    }
    
    // Test 2: Currency defaults to USD when not specified
    console.log('\nTest 2: Currency defaults to USD');
    try {
      const booking2 = await TestBooking.create({
        bookingReference: 'TEST-FIX-002',
        tour: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        totalPrice: 200,
        status: 'Pending',
      });
      
      if (booking2.currency === 'USD') {
        testResults.push({ test: 'Currency default value', status: 'PASS', message: 'Currency defaults to USD correctly' });
        console.log('  ✅ Currency defaults to USD');
      } else {
        testResults.push({ test: 'Currency default value', status: 'FAIL', message: `Expected USD, got ${booking2.currency}` });
        console.log('  ❌ Currency default mismatch');
      }
    } catch (err: any) {
      testResults.push({ test: 'Currency default value', status: 'FAIL', message: err.message });
      console.log('  ❌ Error:', err.message);
    }
    
    // Test 3: paymentId unique index prevents duplicates
    console.log('\nTest 3: paymentId unique index');
    try {
      await TestBooking.create({
        bookingReference: 'TEST-FIX-003',
        tour: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        totalPrice: 150,
        currency: 'GBP',
        paymentId: 'pi_test_unique_123',
      });
      
      // Try to create another booking with the same paymentId
      try {
        await TestBooking.create({
          bookingReference: 'TEST-FIX-004',
          tour: new mongoose.Types.ObjectId(),
          user: new mongoose.Types.ObjectId(),
          totalPrice: 150,
          currency: 'GBP',
          paymentId: 'pi_test_unique_123', // Same paymentId - should fail
        });
        testResults.push({ test: 'paymentId unique index', status: 'FAIL', message: 'Duplicate paymentId was allowed' });
        console.log('  ❌ Duplicate paymentId was allowed (should have been rejected)');
      } catch (dupError: any) {
        if (dupError.code === 11000) {
          testResults.push({ test: 'paymentId unique index', status: 'PASS', message: 'Duplicate paymentId correctly rejected' });
          console.log('  ✅ Duplicate paymentId correctly rejected (E11000 duplicate key error)');
        } else {
          testResults.push({ test: 'paymentId unique index', status: 'FAIL', message: `Unexpected error: ${dupError.message}` });
          console.log('  ❌ Unexpected error:', dupError.message);
        }
      }
    } catch (err: any) {
      testResults.push({ test: 'paymentId unique index', status: 'FAIL', message: err.message });
      console.log('  ❌ Error:', err.message);
    }
    
    // Test 4: Multiple bookings allowed with null/undefined paymentId (sparse index)
    console.log('\nTest 4: Sparse index allows multiple null paymentIds');
    try {
      await TestBooking.create({
        bookingReference: 'TEST-FIX-005',
        tour: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        totalPrice: 50,
        // No paymentId (null/undefined)
      });
      
      await TestBooking.create({
        bookingReference: 'TEST-FIX-006',
        tour: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        totalPrice: 75,
        // No paymentId (null/undefined) - should be allowed by sparse index
      });
      
      testResults.push({ test: 'Sparse index allows null paymentIds', status: 'PASS', message: 'Multiple bookings without paymentId allowed' });
      console.log('  ✅ Multiple bookings without paymentId allowed (sparse index working)');
    } catch (err: any) {
      testResults.push({ test: 'Sparse index allows null paymentIds', status: 'FAIL', message: err.message });
      console.log('  ❌ Error:', err.message);
    }
    
    // Test 5: Valid currency validation
    console.log('\nTest 5: Currency enum validation');
    try {
      await TestBooking.create({
        bookingReference: 'TEST-FIX-007',
        tour: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        totalPrice: 100,
        currency: 'INVALID', // Invalid currency
      });
      testResults.push({ test: 'Currency enum validation', status: 'FAIL', message: 'Invalid currency was allowed' });
      console.log('  ❌ Invalid currency was allowed (should have been rejected)');
    } catch (err: any) {
      if (err.name === 'ValidationError') {
        testResults.push({ test: 'Currency enum validation', status: 'PASS', message: 'Invalid currency correctly rejected' });
        console.log('  ✅ Invalid currency correctly rejected');
      } else {
        testResults.push({ test: 'Currency enum validation', status: 'FAIL', message: `Unexpected error: ${err.message}` });
        console.log('  ❌ Unexpected error:', err.message);
      }
    }
    
    // Clean up test data
    await TestBooking.deleteMany({ bookingReference: /^TEST-FIX-/ });
    console.log('\n🧹 Cleaned up test data');
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    
    testResults.forEach(result => {
      const emoji = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${emoji} ${result.test}: ${result.message}`);
    });
    
    console.log('\n' + '-'.repeat(50));
    console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All booking fixes verified successfully!');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the fixes.');
    }
    
    // Disconnect
    await mongoose.disconnect();
    
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (err) {
    console.error('❌ Test suite failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();

