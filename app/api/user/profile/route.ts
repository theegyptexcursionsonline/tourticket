import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedPayload = await verifyToken(token);

    if (!decodedPayload || !decodedPayload.sub) {
      return NextResponse.json({ error: 'Not authenticated: Invalid token' }, { status: 401 });
    }

    const userId = decodedPayload.sub as string;

    // Parse request body
    const body = await request.json();
    const { firstName, lastName, bio, location } = body;

    // Validation
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return NextResponse.json({ error: 'Names must be at least 2 characters long' }, { status: 400 });
    }

    // Optional field validation
    if (bio && bio.length > 500) {
      return NextResponse.json({ error: 'Bio cannot exceed 500 characters' }, { status: 400 });
    }

    if (location && location.length > 100) {
      return NextResponse.json({ error: 'Location cannot exceed 100 characters' }, { status: 400 });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(bio !== undefined && { bio: bio.trim() }),
        ...(location !== undefined && { location: location.trim() })
      },
      { 
        new: true, 
        runValidators: true,
        select: '-password' // Exclude password from response
      }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
      }
      
      if (error.name === 'CastError') {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET method to retrieve user profile
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedPayload = await verifyToken(token);

    if (!decodedPayload || !decodedPayload.sub) {
      return NextResponse.json({ error: 'Not authenticated: Invalid token' }, { status: 401 });
    }

    const userId = decodedPayload.sub as string;

    // Find user
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: user 
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}