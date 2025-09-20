import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { email, password } = await request.json();

    // --- Basic Validation ---
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // --- Find User in Local DB ---
    // Explicitly select the password field as it's excluded by default in the schema
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // --- Compare Passwords ---
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // --- Prepare User Data for Token and Response ---
    const userPayload = {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
    };

    // --- Generate JWT ---
    const token = await signToken({
      sub: user._id.toString(), // Convert ObjectId to string
      email: user.email,
      given_name: user.firstName,
      family_name: user.lastName,
      iat: Math.floor(Date.now() / 1000),
    });

    // --- Success Response ---
    return NextResponse.json({
      success: true,
      message: 'Login successful!',
      token,
      user: userPayload,
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}