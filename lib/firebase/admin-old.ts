// Firebase Admin SDK for server-side operations
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  let initialized = false;

  // Strategy 1: Try to load from service account file (best for deployment)
  const serviceAccountPath = path.join(process.cwd(), '.firebase', 'service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized from service account file');
      initialized = true;
    } catch (error) {
      console.error('❌ Error loading Firebase service account from file:', error);
    }
  }

  // Strategy 2: Try individual environment variables (fallback)
  if (!initialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        console.log('✅ Firebase Admin initialized with individual credentials');
        initialized = true;
      } catch (error) {
        console.error('❌ Error initializing Firebase Admin with individual credentials:', error);
      }
    }
  }

  // Strategy 3: Try base64-encoded JSON from environment variable (common for deployment)
  if (!initialized) {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (serviceAccountBase64) {
      try {
        const serviceAccountJSON = JSON.parse(
          Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJSON),
        });
        console.log('✅ Firebase Admin initialized from base64 env variable');
        initialized = true;
      } catch (error) {
        console.error('❌ Error decoding base64 service account:', error);
      }
    }
  }

  // Strategy 4: Try full JSON from environment variable (legacy fallback)
  if (!initialized) {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountEnv) {
      try {
        const serviceAccountJSON = JSON.parse(serviceAccountEnv);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJSON),
        });
        console.log('⚠️ Firebase Admin initialized with full JSON from env');
        initialized = true;
      } catch (error) {
        console.error('❌ Error parsing Firebase service account from env:', error);
      }
    }
  }

  if (!initialized) {
    throw new Error(
      'Firebase Admin SDK credentials not found. ' +
      'Either create .firebase/service-account.json or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY'
    );
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
