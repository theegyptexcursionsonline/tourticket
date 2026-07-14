# Firebase server credential launch gate

## Current decision

Firebase Admin must use the hosting platform's secret environment variables for general availability:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (escaped newlines are supported)

The existing service-account key may be retained as directed; this gate does not rotate, download, print, or inspect it. It only changes where the key is supplied to the application.

## Explicit launch risk

`lib/firebase/admin.ts` still contains a legacy fallback that can download a complete Firebase service-account JSON file from a signed Cloudinary raw URL, and `scripts/upload-firebase-to-cloudinary.sh` can create that object. This couples an identity root credential to the media account and makes Cloudinary signing credentials sufficient to retrieve it. The current local environment does not prove that production already has the three individual Firebase variables, so removing the fallback in this working tree is not demonstrably backward-safe.

Do not run the upload script or configure `FIREBASE_CLOUDINARY_PUBLIC_ID` for a new environment. The Cloudinary fallback is migration-only and blocks a GA verdict until the direct environment-variable path is proven in the deployed preview.

## Required pre-GA migration

1. In the approved Netlify team, set the three individual Firebase server variables as secret values. Preserve private-key newlines exactly or use escaped `\\n` sequences.
2. Do not put the service-account JSON in Git, build logs, support tickets, Cloudinary, client-side variables, or screenshots.
3. Deploy a preview and verify a real Firebase ID token, verified-email guest-profile claim, password-reset link generation, and an invalid-token rejection. Record only pass/fail evidence—never the token or credential.
4. Confirm runtime logs say that Firebase Admin used individual credentials and never attempted the Cloudinary fallback.
5. Remove `FIREBASE_CLOUDINARY_PUBLIC_ID` from the hosting environment, then remove the Cloudinary fallback and upload script in a separately reviewed change.
6. If the key has ever been publicly exposed or retrieval access cannot be accounted for, stop and rotate it despite the current no-rotation preference.

Until steps 1–4 are evidenced, Firebase server authentication is configured in code but not certified for GA.
