// Firebase client-side configuration
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "***REMOVED***",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "egypt-excursionsonline.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "egypt-excursionsonline",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "egypt-excursionsonline.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "498291617386",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:498291617386:web:ef2d6a308b25e8fddee413",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XS03B6CEJT"
};

// Initialize Firebase (client-side only)
let app: FirebaseApp;
let auth: Auth;
let analytics: Analytics | null = null;
let googleProvider: GoogleAuthProvider;

// Only initialize if not already initialized
if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);

  // Initialize analytics only in browser
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    analytics = getAnalytics(app);
  }

  // Configure Google Auth Provider
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
}

export { auth, googleProvider, analytics };
export default app;
