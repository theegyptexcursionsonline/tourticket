import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import User, { type IUser } from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  AdminPermission,
  AdminRole,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';
import { EmailService } from '@/lib/email/emailService';
import { isValidWorkEmail } from '@/lib/validation/email';

type AdminUserSource = Pick<IUser, 'firstName' | 'lastName' | 'email' | 'role' | 'permissions' | 'isActive' | 'lastLoginAt' | 'createdAt'> & { _id: unknown };

const sanitize = (user: AdminUserSource) => ({
  id: String(user._id),
  _id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  permissions: user.permissions || [],
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

function normalizePermissions(
  requested: unknown,
  role: AdminRole,
): AdminPermission[] {
  if (!Array.isArray(requested) || requested.length === 0) {
    return getDefaultPermissions(role);
  }

  return requested
    .filter((perm): perm is AdminPermission =>
      ADMIN_PERMISSIONS.includes(perm as AdminPermission),
    )
    .filter((value, index, self) => self.indexOf(value) === index);
}

const normalizeRole = (role: unknown): AdminRole => {
  if (typeof role === 'string' && ADMIN_ROLES.includes(role as AdminRole)) {
    return role as AdminRole;
  }
  return 'operations';
};

const getSupportEmail = () =>
  process.env.SUPPORT_EMAIL ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  process.env.MAILGUN_FROM_EMAIL ||
  'support@tourticket.app';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  await dbConnect();

  const teamMembers = await User.find({
    role: { $ne: 'customer' },
    $or: [
      { adminPortalScopes: 'main' },
      {
        $and: [
          {
            $or: [
              { adminPortalScopes: { $exists: false } },
              { adminPortalScopes: { $size: 0 } },
            ],
          },
          {
            $or: [
              { tenantIds: { $exists: false } },
              { tenantIds: { $size: 0 } },
            ],
          },
        ],
      },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    data: teamMembers.map(sanitize),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    await dbConnect();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body.' },
        { status: 400 },
      );
    }
    const { firstName, lastName, email, role = 'operations', permissions } = body;

    if (
      typeof firstName !== 'string'
      || typeof lastName !== 'string'
      || typeof email !== 'string'
      || !firstName.trim()
      || !lastName.trim()
      || !email.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, and email are required.' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidWorkEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }
    const normalizedRole = normalizeRole(role);
    const effectivePermissions = normalizePermissions(permissions, normalizedRole);

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpires = new Date();
    invitationExpires.setDate(invitationExpires.getDate() + 7); // 7 days from now

    const existing = await User.findOne({ email: normalizedEmail })
      .select('+invitationToken +invitationExpires');
    let convertedCustomer = false;
    let originalCustomerState: {
      permissions: AdminPermission[];
      adminPortalScopes?: string[];
      requirePasswordChange: boolean;
    } | null = null;
    let user;

    if (existing) {
      if (existing.role !== 'customer') {
        return NextResponse.json(
          { success: false, error: 'This account is already an administrator.' },
          { status: 409 },
        );
      }
      if (!existing.isActive) {
        return NextResponse.json(
          { success: false, error: 'This customer account is inactive and cannot be added to the team.' },
          { status: 409 },
        );
      }

      originalCustomerState = {
        permissions: [...(existing.permissions || [])],
        adminPortalScopes: Array.isArray(existing.adminPortalScopes)
          ? [...existing.adminPortalScopes]
          : undefined,
        requirePasswordChange: Boolean(existing.requirePasswordChange),
      };
      user = await User.findOneAndUpdate(
        { _id: existing._id, role: 'customer', isActive: true },
        {
          $set: {
            role: normalizedRole,
            permissions: effectivePermissions,
            invitationToken,
            invitationExpires,
            requirePasswordChange: true,
          },
          $addToSet: { adminPortalScopes: 'main' },
        },
        { new: true, runValidators: true },
      );
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'The existing account changed. Refresh and try again.' },
          { status: 409 },
        );
      }
      convertedCustomer = true;
    } else {
      // New team members receive an unusable random password until they accept
      // the invitation and choose their own.
      const temporaryPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      user = await User.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: normalizedRole,
        permissions: effectivePermissions,
        isActive: false, // Inactive until they accept invitation
        invitationToken,
        invitationExpires,
        requirePasswordChange: true,
        adminPortalScopes: ['main'],
      });
    }

    const inviteeName = `${user.firstName} ${user.lastName}`.trim();
    const inviterName = auth.email || 'Admin Team';
  
  // Generate invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://tourticket.app';
    const invitationLink = `${baseUrl.replace(/\/$/, '')}/accept-invitation?token=${invitationToken}`;

  // Try to send invitation email - rollback if it fails
    try {
      await EmailService.sendAdminInviteEmail({
        inviteeName: inviteeName || normalizedEmail,
        inviteeEmail: normalizedEmail,
        inviterName,
        temporaryPassword: '', // No longer sending password
        role: normalizedRole,
        permissions: effectivePermissions,
        portalLink: invitationLink,
        supportEmail: getSupportEmail(),
      });
    } catch (emailError) {
      console.error('Failed to send admin invite email, rolling back user creation:', emailError);
      if (convertedCustomer && originalCustomerState) {
        const rollback: {
          $set: Record<string, unknown>;
          $unset: Record<string, 1>;
        } = {
          $set: {
            role: 'customer',
            permissions: originalCustomerState.permissions,
            requirePasswordChange: originalCustomerState.requirePasswordChange,
          },
          $unset: {
            invitationToken: 1,
            invitationExpires: 1,
          },
        };
        if (originalCustomerState.adminPortalScopes) {
          rollback.$set.adminPortalScopes = originalCustomerState.adminPortalScopes;
        } else {
          rollback.$unset.adminPortalScopes = 1;
        }
        await User.updateOne(
          { _id: user._id, invitationToken },
          rollback,
        );
      } else {
        await User.findByIdAndDelete(user._id);
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send invitation email. Please check the address and try again.',
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: sanitize(user),
        convertedExistingCustomer: convertedCustomer,
      },
      { status: convertedCustomer ? 200 : 201 },
    );
  } catch (error) {
    const err = error as { name?: string; code?: number; message?: string };
    if (err?.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 },
      );
    }
    if (err?.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: err.message || 'Invalid team member details.' },
        { status: 400 },
      );
    }
    console.error('Failed to invite team member:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to invite this teammate. Please try again.' },
      { status: 500 },
    );
  }
}
