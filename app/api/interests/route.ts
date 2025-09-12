// app/api/interests/route.ts
import { NextResponse } from 'next/server';

// In a real application, you would fetch this from your database (e.g., from a Categories collection).
// For now, we'll serve the existing static data via an API to make the component dynamic.
const allInterests = [
  { name: "FUN", products: 212 },
  { name: "FAMILY-FRIENDLY", products: 180 },
  { name: "SIGHTSEEING", products: 123 },
  { name: "HISTORICAL", products: 107 },
  { name: "BUS TOURS", products: 59 },
  { name: "ON THE WATER", products: 66 },
  { name: "ROMANTIC", products: 24 },
  { name: "INSTAGRAM MUSEUMS", products: 41 },
  { name: "PARTY", products: 19 },
  { name: "ART", products: 49 },
  { name: "WITH FOOD", products: 23 },
  { name: "NIGHTLIFE", products: 26 },
  { name: "SELFIE MUSEUM", products: 40 },
  { name: "WITH DRINKS", products: 36 },
  { name: "PLANTS & FLOWERS", products: 24 },
  { name: "CROSSING THE BORDER", products: 2 },
  { name: "BIKE TOURS", products: 4 },
  { name: "WALKING TOURS", products: 9 },
  { name: "ANIMALS", products: 13 },
];

export async function GET() {
  try {
    // Simulate a network delay to see the loading state
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    return NextResponse.json({ success: true, data: allInterests });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch interests." },
      { status: 500 }
    );
  }
}