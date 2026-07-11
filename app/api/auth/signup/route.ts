// app/api/auth/signup/route.ts (Updated)
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';
import { EmailService } from '@/lib/email/emailService'; // 🆕 Add this import
import { getDefaultPermissions } from '@/lib/constants/adminPermissions';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { firstName, lastName, email, password } = await request.json();

    // Validation (keep existing)
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Check if user exists (keep existing)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user (keep existing)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

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
      // Fetch recommended tours from database
      const Tour = (await import('@/lib/models/Tour')).default;
      const recommendedTours = await Tour.find({})
        .select('title slug images discountPrice')
        .limit(3)
        .lean();

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      const tourRecommendations = recommendedTours.map((tour) => ({
        title: tour.title,
        image: tour.images?.[0] || `${baseUrl}/pyramid.png`,
        price: tour.discountPrice ? `From $${tour.discountPrice}` : 'From $99',
        link: `${baseUrl}/tour/${tour.slug}`
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
    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: userPayload,
    });

  } catch (error: unknown) {
    console.error('Signup Error:', error);
    return NextResponse.json(
      { error: 'Could not create account at this time.' },
      { status: 500 }
    );
  }
}
