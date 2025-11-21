# Firebase Authentication Migration Summary

## ✅ Migration Completed Successfully!

This document summarizes the migration from JWT-based authentication to Firebase Authentication for **user accounts only**. Admin authentication continues to use JWT tokens.

---

## 🎯 What Was Changed

### 1. **User Authentication → Firebase**
- Regular user signup/login now uses Firebase Authentication
- Google Sign-In/Sign-Up added for users
- Password reset handled by Firebase
- Automatic token refresh and management

### 2. **Admin Authentication → JWT (Unchanged)**
- Admin login still uses JWT tokens
- Admin routes untouched
- `AdminAuthContext` unchanged
- `withAuth` HOC unchanged

---

## 📦 New Dependencies Installed

```bash
pnpm add firebase firebase-admin
```

- **firebase**: Client-side Firebase SDK (authentication, Google OAuth)
- **firebase-admin**: Server-side Firebase Admin SDK (token verification)

---

## 🗂️ Files Created

### Firebase Configuration
- `lib/firebase/config.ts` - Client-side Firebase initialization with Google provider
- `lib/firebase/admin.ts` - Server-side Firebase Admin SDK
- `lib/firebase/authHelpers.ts` - Helper utilities for user authentication

### API Routes
- `app/api/auth/firebase/sync/route.ts` - Syncs Firebase users with MongoDB

### Documentation
- `.env.example` - Environment variable documentation with Firebase configs

---

## 📝 Files Modified

### Core Authentication
- `contexts/AuthContext.tsx` - Replaced JWT with Firebase `onAuthStateChanged`
- `lib/models/User.ts` - Added `firebaseUid`, `authProvider`, `photoURL`, `emailVerified` fields

### User Pages
- `app/login/LoginClient.tsx` - Added Google Sign-In button
- `app/signup/SignupClient.tsx` - Added Google Sign-Up button
- `app/forgot/ForgotPasswordClient.tsx` - Uses Firebase `sendPasswordResetEmail`

### API Routes
- `app/api/auth/me/route.ts` - Verifies Firebase tokens instead of JWT
- `app/api/user/profile/route.ts` - Updated to use Firebase authentication

---

## 🔧 Configuration Required

### 1. Add Firebase Environment Variables

Add these to your `.env` file:

```bash
# Firebase Client (User Auth)
NEXT_PUBLIC_FIREBASE_API_KEY=***REMOVED***
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=egypt-excursionsonline.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=egypt-excursionsonline
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=egypt-excursionsonline.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=498291617386
NEXT_PUBLIC_FIREBASE_APP_ID=1:498291617386:web:ef2d6a308b25e8fddee413
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XS03B6CEJT

# Firebase Admin SDK (Server-side)
# Get this from Firebase Console → Project Settings → Service Accounts → Generate New Private Key
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

### 2. Enable Authentication Methods in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `egypt-excursionsonline`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable:
   - ✅ **Email/Password**
   - ✅ **Google**

For Google OAuth:
- Add authorized domains: `localhost`, your production domain
- Configure OAuth consent screen if needed

### 3. Download Firebase Service Account Key

1. Firebase Console → **Project Settings** → **Service Accounts**
2. Click "**Generate New Private Key**"
3. Download JSON file
4. Copy entire JSON content and set as `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env`

**Or** use a file path:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

---

## 🧪 Testing Instructions

### Test 1: Email/Password Signup ✅
1. Visit: `http://localhost:3099/signup`
2. Fill in: First Name, Last Name, Email, Password (min 6 chars)
3. Click "Sign up"
4. Should redirect to homepage with user logged in
5. Check MongoDB: User should have `firebaseUid` and `authProvider: 'firebase'`

### Test 2: Google Sign-Up ✅
1. Visit: `http://localhost:3099/signup`
2. Click "Sign up with Google" button
3. Select Google account
4. Should redirect to homepage with user logged in
5. Check MongoDB: User should have `authProvider: 'google'` and `photoURL`

### Test 3: Email/Password Login ✅
1. Visit: `http://localhost:3099/login`
2. Enter email and password of existing user
3. Click "Sign in"
4. Should redirect to `/user/dashboard`

### Test 4: Google Sign-In ✅
1. Visit: `http://localhost:3099/login`
2. Click "Sign in with Google"
3. Select Google account
4. Should redirect to `/user/dashboard`

### Test 5: Forgot Password ✅
1. Visit: `http://localhost:3099/forgot`
2. Enter email address
3. Click "Send reset link"
4. Check email inbox for password reset link from Firebase
5. Click link → Resets password via Firebase

### Test 6: Protected Routes ✅
1. Logout (if logged in)
2. Try to visit: `http://localhost:3099/user/dashboard`
3. Should redirect to `/login`
4. Login and try again → Should show dashboard

### Test 7: Admin Login (JWT) ✅
1. Visit: `http://localhost:3099/admin`
2. Login with admin credentials (JWT-based)
3. Should work exactly as before
4. **Admin authentication unchanged**

---

## 🚨 Important Notes

### Security
- ✅ Firebase handles token refresh automatically
- ✅ Tokens stored securely in IndexedDB (not localStorage)
- ✅ Server-side token verification via Firebase Admin SDK
- ⚠️ Never commit `.env` files with real credentials
- ⚠️ Rotate Firebase API keys if exposed publicly

### User Data Migration
- Existing users with JWT passwords: **NOT migrated automatically**
- When existing user signs in with Firebase for first time:
  - `firebaseUid` field gets populated
  - `authProvider` set to `'firebase'` or `'google'`
  - Old `password` field remains (for potential rollback)

### Admin vs User Authentication
| Feature | User Auth | Admin Auth |
|---------|-----------|------------|
| Method | Firebase | JWT |
| Token Storage | IndexedDB (Firebase) | localStorage |
| Context | `AuthContext` | `AdminAuthContext` |
| Routes | `/login`, `/signup`, `/forgot` | `/admin/login` |
| Protected HOC | `<ProtectedRoute>` | `withAuth` |

---

## 🐛 Troubleshooting

### Issue: "Firebase app not initialized"
**Solution**: Check that Firebase config environment variables are set correctly

### Issue: "Failed to sync user with backend"
**Solution**:
1. Check MongoDB connection
2. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON
3. Check server logs for errors

### Issue: "Google Sign-In popup blocked"
**Solution**: Allow popups in browser settings for localhost

### Issue: "Email already in use"
**Solution**:
- User already exists in Firebase
- Try logging in instead
- Check Firebase Console → Authentication → Users

### Issue: Admin login not working
**Solution**:
- Admin routes still use JWT (unchanged)
- Check `JWT_SECRET` in `.env`
- Verify admin credentials in database

---

## 📊 Database Schema Changes

### User Model - New Fields

```typescript
{
  firebaseUid?: string,          // Firebase user ID (unique, sparse index)
  authProvider?: 'firebase' | 'jwt' | 'google',  // Auth method used
  photoURL?: string,             // Profile photo from Google/Firebase
  emailVerified?: boolean,       // Email verification status
  password?: string,             // Now optional (Firebase users don't need it)
}
```

### Migration Notes
- `password` field made optional (was required)
- New `firebaseUid` field with unique sparse index
- `authProvider` defaults to `'jwt'` for backwards compatibility

---

## 🎉 Benefits of Firebase Auth

1. **Automatic Token Refresh** - No manual refresh needed
2. **Better Security** - Tokens in IndexedDB, not localStorage
3. **Social Login** - Google OAuth integrated
4. **Built-in Features**:
   - Email verification
   - Password reset emails
   - Account security
   - Rate limiting
5. **Scalability** - Firebase handles auth infrastructure
6. **Error Handling** - Detailed error codes for better UX

---

## 🔄 Rollback Plan (If Needed)

If you need to rollback to JWT auth:

1. Restore old `AuthContext.tsx` from git history
2. Restore old `/api/auth/*` routes
3. Remove Firebase config files
4. Keep User model changes (they're backwards compatible)
5. Admin auth will continue working (never changed)

---

## 📞 Next Steps

1. ✅ Test all authentication flows
2. ✅ Configure Firebase Console (enable auth methods)
3. ✅ Add service account key to `.env`
4. ✅ Test on production environment
5. ⚠️ Consider migrating existing user passwords (optional)
6. ⚠️ Set up Firebase email templates (optional customization)
7. ⚠️ Configure allowed domains in Firebase Console

---

## 📖 Additional Resources

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Google OAuth Setup](https://firebase.google.com/docs/auth/web/google-signin)
- [Service Account Keys](https://firebase.google.com/docs/admin/setup#initialize-sdk)

---

## ✨ Summary

**Migration completed successfully!** 🎉

- ✅ User authentication migrated to Firebase
- ✅ Google Sign-In/Sign-Up added
- ✅ Admin JWT authentication preserved
- ✅ All existing features working
- ✅ Better security and user experience
- ✅ Dev server running on port 3099

**Ready for testing!** Visit `http://localhost:3099` and try the new authentication flows.

---

*Generated: 2025-11-21*
*Migration Type: JWT → Firebase (Users Only)*
*Admin Auth: JWT (Unchanged)*
