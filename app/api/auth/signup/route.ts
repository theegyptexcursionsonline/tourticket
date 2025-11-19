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
    const effectiveRole = (newUser as any).role || 'customer';
    const assignedPermissions =
      (newUser as any).permissions && (newUser as any).permissions.length > 0
        ? (newUser as any).permissions
        : getDefaultPermissions(effectiveRole);

    const userPayload = {
      id: (newUser._id as any).toString(),
      _id: (newUser._id as any).toString(),
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      name: `${newUser.firstName} ${newUser.lastName}`,
      role: effectiveRole,
      permissions: assignedPermissions,
    };

    // Generate JWT (keep existing)
    const token = await signToken({
      sub: (newUser._id as any).toString(),
      email: newUser.email,
      given_name: newUser.firstName,
      family_name: newUser.lastName,
      iat: Math.floor(Date.now() / 1000),
      role: effectiveRole,
      permissions: assignedPermissions,
    });

    // 🆕 Send Welcome Email
    try {
      await EmailService.sendWelcomeEmail({
        customerName: `${firstName} ${lastName}`,
        customerEmail: email,
        dashboardLink: `${process.env.NEXT_PUBLIC_BASE_URL}/user/dashboard`,
        recommendedTours: [
          {
            title: "Pyramids of Giza Day Tour",
            image: `${process.env.NEXT_PUBLIC_BASE_URL}/images/pyramids.jpg`,
            price: "$49",
            link: `${process.env.NEXT_PUBLIC_BASE_URL}/tour/pyramids-giza`
          },
          {
            title: "Luxor Temple & Valley of Kings",
            image: `${process.env.NEXT_PUBLIC_BASE_URL}/images/luxor.jpg`,
            price: "$89",
            link: `${process.env.NEXT_PUBLIC_BASE_URL}/tour/luxor-temples`
          },
          {
            title: "Nile River Dinner Cruise",
            image: `${process.env.NEXT_PUBLIC_BASE_URL}/images/nile-cruise.jpg`,
            price: "$65",
            link: `${process.env.NEXT_PUBLIC_BASE_URL}/tour/nile-dinner-cruise`
          }
        ]
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

  } catch (error: any) {
    console.error('Signup Error:', error);
    return NextResponse.json(
      { error: 'Could not create account at this time.' },
      { status: 500 }
    );
  }
}