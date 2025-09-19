// app/api/tours/[tourId]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { jwtVerify, JWTPayload } from 'jose';

const getTokenFromRequest = (request: NextRequest): string | null => {
  // Try Authorization header first
  const auth = request.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.split(' ')[1];
  }

  // Next: cookies. NextRequest.cookies has .get in newer Next versions
  try {
    // Next.js Request cookies API may be either request.cookies.get(name) or request.cookies[name]
    // We'll attempt common cookie names used for sessions or custom token cookie named 'token'
    const cookieCandidates = [
      'token',
      'jwt',
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'session',
      'sessionToken',
    ];

    for (const name of cookieCandidates) {
      // Type-safely attempt multiple cookie access methods
      // (NextRequest.cookies.get returns a Cookie object with .value in newer versions)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const c1 = typeof request.cookies?.get === 'function' ? request.cookies.get(name) : undefined;
      if (c1 && typeof c1.value === 'string') return c1.value;

      // fallback to object-style if present
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const c2 = request.cookies?.[name];
      if (c2 && typeof c2 === 'string') return c2;
    }
  } catch (err) {
    // ignore cookie parsing differences
  }

  return null;
};

const verifyJwt = async (token: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured in environment');
  }

  // jose expects a Key like a Uint8Array for HMAC (HS256)
  const key = new TextEncoder().encode(secret);

  // jwtVerify will throw if token invalid/expired
  const verified = await jwtVerify(token, key);
  return verified.payload as JWTPayload;
};

// GET reviews for a tour
export async function GET(request: NextRequest, { params }: { params: { tourId: string } }) {
  await dbConnect();

  try {
    const reviews = await Review.find({ tour: params.tourId }).populate({
      path: 'user',
      model: User,
      select: 'name picture',
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json({ message: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST a new review for a tour
export async function POST(request: NextRequest, { params }: { params: { tourId: string } }) {
  await dbConnect();

  // Extract token
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized: no token provided' }, { status: 401 });
  }

  // Verify token with jose
  let payload: JWTPayload;
  try {
    payload = await verifyJwt(token);
  } catch (err: any) {
    console.error('JWT verification failed:', err?.message || err);
    return NextResponse.json({ message: 'Unauthorized: invalid token' }, { status: 401 });
  }

  // Expect a `sub` (subject) claim containing the user id
  const userId = String(payload.sub ?? payload.id ?? '');
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized: token missing user id' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { rating, comment } = body;

    if (!rating || !comment) {
      return NextResponse.json({ error: 'Rating and comment are required' }, { status: 400 });
    }

    const newReview = new Review({
      tour: params.tourId,
      user: userId,
      rating,
      comment,
    });

    await newReview.save();

    // Recalculate average rating for the tour
    const stats = await Review.aggregate([
      { $match: { tour: newReview.tour } },
      { $group: { _id: '$tour', avgRating: { $avg: '$rating' } } }
    ]);

    if (stats.length > 0) {
      await Tour.findByIdAndUpdate(params.tourId, {
        rating: Number(stats[0].avgRating).toFixed(1),
      });
    }

    const populatedReview = await Review.findById(newReview._id).populate({
      path: 'user',
      model: User,
      select: 'name picture',
    });

    return NextResponse.json(populatedReview, { status: 201 });
  } catch (error: any) {
    console.error('Review submission error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
