import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { firstName, lastName, email, password } = await request.json();

    // --- Validation ---
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // --- Check if User Exists in Local DB ---
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // --- Hash Password ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- Create New User in DB ---
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    // --- Prepare User Data for Token and Response (excluding password) ---
    const userPayload = {
      id: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    };

    // --- Generate JWT ---
    const token = await signToken({
      sub: newUser._id,
      email: newUser.email,
      given_name: newUser.firstName,
      family_name: newUser.lastName,
      iat: Math.floor(Date.now() / 1000),
    });

    // --- Success Response ---
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