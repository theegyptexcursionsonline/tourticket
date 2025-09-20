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

    // Ensure userId is a string (convert from buffer if needed)
    const userId = typeof decodedPayload.sub === 'string' 
      ? decodedPayload.sub 
      : decodedPayload.sub.toString();

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

    // More robust userId extraction and conversion
    let userId;
    try {
      const rawUserId = decodedPayload.sub;
      
      // Handle different possible formats
      if (typeof rawUserId === 'string') {
        userId = rawUserId;
      } else if (rawUserId && typeof rawUserId === 'object') {
        // Handle buffer objects
        if (rawUserId.type === 'Buffer' && Array.isArray(rawUserId.data)) {
          userId = Buffer.from(rawUserId.data).toString('hex');
        } else if (rawUserId.buffer) {
          userId = Buffer.from(rawUserId.buffer).toString('hex');
        } else {
          userId = String(rawUserId);
        }
      } else {
        userId = String(rawUserId);
      }

      console.log('Extracted userId:', userId, 'Type:', typeof userId); // Debug log
      
      // Validate that userId looks like a valid MongoDB ObjectId (24 hex characters)
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        console.error('Invalid userId format:', userId);
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }
      
    } catch (conversionError) {
      console.error('Error converting userId:', conversionError);
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    console.log('Looking up user with ID:', userId); // Debug log

    // Find user and add full name
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add computed name field
    const userWithName = {
      ...user.toObject(),
      name: `${user.firstName} ${user.lastName}`
    };

    return NextResponse.json({ 
      success: true, 
      data: userWithName 
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'CastError') {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}