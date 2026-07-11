import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseUser, verifyFirebaseToken } from '@/lib/firebase/admin';
import { syncFirebaseUserToMongo } from '@/lib/firebase/authHelpers';

/**
 * POST /api/auth/firebase/sync
 * Sync Firebase user with MongoDB
 * Creates or updates MongoDB user record based on Firebase authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Extract Firebase ID token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);

    // Verify Firebase token
    let verifyResult;
    try {
      verifyResult = await verifyFirebaseToken(idToken);
    } catch (verifyError: any) {
      console.error('Firebase token verification error:', verifyError);
      return NextResponse.json(
        { success: false, error: 'Token verification failed' },
        { status: 401 }
      );
    }

    if (!verifyResult.success || !verifyResult.uid) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Never trust profile, email-verification or provider fields supplied by
    // the browser. Load the authoritative identity from Firebase Admin.
    const firebaseRecord = await getFirebaseUser(verifyResult.uid);
    if (!firebaseRecord.success || !firebaseRecord.user) {
      return NextResponse.json({ success: false, error: 'Firebase account not found' }, { status: 401 });
    }
    const record = firebaseRecord.user;
    if (record.disabled || !record.email || !record.emailVerified) {
      return NextResponse.json({ success: false, error: 'A verified email is required' }, { status: 403 });
    }

    // Sync user with MongoDB
    let result;
    try {
      result = await syncFirebaseUserToMongo({
        uid: record.uid,
        email: record.email,
        displayName: record.displayName,
        photoURL: record.photoURL,
        emailVerified: record.emailVerified,
        providerData: record.providerData,
      });
    } catch (syncError: any) {
      if (syncError?.code === 'ACCOUNT_LINK_REQUIRED') {
        return NextResponse.json(
          { success: false, error: 'An account already exists for this email. Sign in with its original method before linking Firebase.' },
          { status: 409 },
        );
      }
      console.error('MongoDB sync error:', syncError);
      return NextResponse.json(
        { success: false, error: 'Account synchronization failed' },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to sync user with database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      isNewUser: result.isNewUser,
    });
  } catch (error: any) {
    console.error('Firebase sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
