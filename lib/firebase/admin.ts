// Firebase Admin SDK for server-side operations
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Try individual credentials first (recommended - smaller env vars for AWS Lambda)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    // Use individual credentials
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Replace escaped newlines in private key
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase Admin initialized with individual credentials');
    } catch (error) {
      console.error('❌ Error initializing Firebase Admin with individual credentials:', error);
      throw error;
    }
  } else {
    // Fallback to full service account JSON (for backwards compatibility)
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccount) {
      try {
        const serviceAccountJSON = JSON.parse(serviceAccount);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJSON),
        });
        console.log('⚠️ Firebase Admin initialized with full JSON (consider using individual credentials)');
      } catch (error) {
        console.error('❌ Error parsing Firebase service account:', error);
        throw error;
      }
    } else {
      throw new Error('Firebase Admin SDK credentials not found. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY');
    }
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

/**
 * Verify Firebase ID token from client
 * @param idToken - Firebase ID token from client
 * @returns Decoded token with user info
 */
export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      decodedToken,
    };
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

/**
 * Get Firebase user by UID
 * @param uid - Firebase user ID
 */
export async function getFirebaseUser(uid: string) {
  try {
    const user = await adminAuth.getUser(uid);
    return { success: true, user };
  } catch (error) {
    console.error('Error getting Firebase user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'User not found',
    };
  }
}

/**
 * Create or update Firebase user
 * @param uid - Firebase user ID
 * @param data - User data to update
 */
export async function updateFirebaseUser(uid: string, data: {
  email?: string;
  displayName?: string;
  photoURL?: string;
  disabled?: boolean;
}) {
  try {
    const user = await adminAuth.updateUser(uid, data);
    return { success: true, user };
  } catch (error) {
    console.error('Error updating Firebase user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

/**
 * Delete Firebase user
 * @param uid - Firebase user ID
 */
export async function deleteFirebaseUser(uid: string) {
  try {
    await adminAuth.deleteUser(uid);
    return { success: true };
  } catch (error) {
    console.error('Error deleting Firebase user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

export default admin;
