// app/api/auth/signup/route.ts (Updated)
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';
import { EmailService } from '@/lib/email/emailService'; // 🆕 Add this import
import { getDefaultPermissions } from '@/lib/constants/adminPermissions';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import {
  normalizeBoundedText,
  normalizeEmail,
  PublicInputError,
  readBoundedJson,
} from '@/lib/security/publicInput';
import { isClaimableGuestProfile } from '@/lib/auth/guestProfileClaim';
import { contentPath } from '@/lib/content/contentUrl';
import { loadWelcomeTourRecommendations } from '@/lib/auth/welcomeRecommendations';

export async function POST(request: NextRequest) {
  try {
    const body = await readBoundedJson<{
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
      password?: unknown;
    }>(request, 8_192);
    const firstName = normalizeBoundedText(body.firstName, { minimum: 1, maximum: 80 });
    const lastName = normalizeBoundedText(body.lastName, { minimum: 1, maximum: 80 });
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';

    // Validation (keep existing)
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be between 8 and 128 characters' }, { status: 400 });
    }

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'customer-signup',
      subject: email,
      networkLimit: 10,
      subjectLimit: 3,
      windowMs: 60 * 60 * 1_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
      );
    }

    // Select hidden identity fields because a profile is claimable only when
    // both authentication identifiers are absent.
    const existingUser = await User.findOne({ email }).select('+password +firebaseUid');

    let newUser;
    if (existingUser) {
      // A password signup proves only knowledge of an email address. It must
      // never claim a checkout-created guest profile. Verified Firebase sign-
      // in is the supported ownership-proof path for those records.
      return NextResponse.json(
        {
          code: isClaimableGuestProfile(existingUser) ? 'EMAIL_VERIFICATION_REQUIRED' : 'ACCOUNT_EXISTS',
          error: 'An account with this email already exists. Sign in with a verified email to continue.',
        },
        { status: 409 },
      );
    } else {
      try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        newUser = await User.create({
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role: 'customer',
          permissions: [],
          isGuestProfile: false,
        });
      } catch (error: unknown) {
        if ((error as { code?: number | string }).code === 11000) {
          return NextResponse.json(
            { error: 'An account with this email already exists' },
            { status: 409 },
          );
        }
        throw error;
      }
    }

    // Prepare user data (keep existing)
    const effectiveRole = newUser.role || 'customer';
    const assignedPermissions =
      newUser.permissions && newUser.permissions.length > 0
        ? newUser.permissions
        : getDefaultPermissions(effectiveRole);

    const userPayload = {
      id: String(newUser._id),
      _id: String(newUser._id),
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      name: `${newUser.firstName} ${newUser.lastName}`,
      role: effectiveRole,
      permissions: assignedPermissions,
    };

    // Generate JWT (keep existing)
    const token = await signToken({
      sub: String(newUser._id),
      email: newUser.email,
      given_name: newUser.firstName,
      family_name: newUser.lastName,
      iat: Math.floor(Date.now() / 1000),
      role: effectiveRole,
      permissions: assignedPermissions,
      scope: 'customer',
    });

    // 🆕 Send Welcome Email with real recommended tours
    try {
      const recommendedTours = await loadWelcomeTourRecommendations();

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      const tourRecommendations = recommendedTours.map((tour) => ({
        title: tour.title,
        image: tour.images?.[0] || `${baseUrl}/pyramid.png`,
        price: tour.discountPrice ? `From $${tour.discountPrice}` : 'From $99',
        link: `${baseUrl}${contentPath('tour', tour.slug, (tour as { urlType?: string }).urlType)}`
      }));

      // Fallback if no tours found
      if (tourRecommendations.length === 0) {
        tourRecommendations.push({
          title: "Browse All Tours",
          image: `${baseUrl}/pyramid.png`,
          price: "Explore",
          link: `${baseUrl}/tours`
        });
      }

      await EmailService.sendWelcomeEmail({
        customerName: `${firstName} ${lastName}`,
        customerEmail: email,
        dashboardLink: `${baseUrl}/user/dashboard`,
        recommendedTours: tourRecommendations,
        baseUrl
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail signup if email fails
    }

    // Success response (keep existing)
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: userPayload,
    });

    // Signing up IS signing in. Without this cookie the new account held a
    // token in memory only, so every cookie-authenticated route (cart,
    // wishlist, profile, checkout) treated the customer as a guest on the next
    // request. Matches `/api/auth/login` exactly.
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch (error: unknown) {
    if (error instanceof PublicInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Signup Error:', error);
    return NextResponse.json(
      { error: 'Could not create account at this time.' },
      { status: 500 }
    );
  }
}
