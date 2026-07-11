import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import User from '@/lib/models/user';
import dbConnect from '@/lib/dbConnect';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { verifyToken } from '@/lib/jwt';

export async function authenticateCustomerBearer(request: NextRequest) {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return { success: false as const, status: 401, error: 'Authentication required' };

  await dbConnect();
  const firebase = await verifyFirebaseToken(token);
  if (firebase.success && firebase.uid) {
    const user = await User.findOne({ firebaseUid: firebase.uid, isActive: true });
    return user
      ? { success: true as const, user }
      : { success: false as const, status: 401, error: 'Account not found or inactive' };
  }

  const payload = await verifyToken(token);
  if (
    !payload ||
    payload.scope !== 'customer' ||
    typeof payload.sub !== 'string' ||
    !mongoose.Types.ObjectId.isValid(payload.sub)
  ) {
    return { success: false as const, status: 401, error: 'Invalid customer token' };
  }

  const user = await User.findOne({ _id: payload.sub, isActive: true });
  return user
    ? { success: true as const, user }
    : { success: false as const, status: 401, error: 'Account not found or inactive' };
}
