// Firebase Admin SDK with remote JSON file support
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  let initialized = false;

  // Strategy 1: Try base64 from environment (primary)
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

  // Strategy 2: Fetch from remote URL (Cloudinary, S3, etc.)
  if (!initialized) {
    const remoteJsonUrl = process.env.FIREBASE_SERVICE_ACCOUNT_URL;

    if (remoteJsonUrl) {
      try {
        console.log('🔄 Fetching Firebase service account from remote URL...');

        // Use dynamic import to avoid bundling fetch polyfill
        const fetchServiceAccount = async () => {
          const response = await fetch(remoteJsonUrl, {
            headers: {
              'Cache-Control': 'max-age=3600', // Cache for 1 hour
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch service account: ${response.status} ${response.statusText}`);
          }

          return response.json();
        };

        // Note: This is a top-level await, requires Node.js 14.8+ and ES modules
        const serviceAccountJSON = await fetchServiceAccount();

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJSON),
        });
        console.log('✅ Firebase Admin initialized from remote URL');
        initialized = true;
      } catch (error) {
        console.error('❌ Error fetching remote service account:', error);
      }
    }
  }

  // Strategy 3: Individual credentials (fallback)
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

  if (!initialized) {
    throw new Error(
      'Firebase Admin SDK credentials not found. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_BASE64, FIREBASE_SERVICE_ACCOUNT_URL, or individual credentials'
    );
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

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
