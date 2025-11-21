// Firebase Admin SDK for server-side operations
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Check if we have service account credentials
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccount) {
    // Use service account credentials (recommended for production)
    try {
      const serviceAccountJSON = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJSON),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "egypt-excursionsonline",
      });
    } catch (error) {
      console.error('Error parsing Firebase service account:', error);
      // Fall back to default credentials
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "egypt-excursionsonline",
      });
    }
  } else {
    // Use default credentials (for development)
    // This will work if you have GOOGLE_APPLICATION_CREDENTIALS env var set
    // or if running in a Google Cloud environment
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "egypt-excursionsonline",
    });
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
