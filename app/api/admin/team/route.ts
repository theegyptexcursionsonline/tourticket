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
import {
  clearPendingAdminGrant,
  hasPortalMembership,
} from '@/lib/admin/teamMembership';

type AdminUserSource = Pick<
  IUser,
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'role'
  | 'permissions'
  | 'isActive'
  | 'lastLoginAt'
  | 'createdAt'
  | 'pendingAdminRole'
  | 'pendingAdminPermissions'
  | 'pendingAdminScopes'
  | 'formerAdminScopes'
  | 'requirePasswordChange'
> & { _id: unknown };

const sanitize = (user: AdminUserSource) => {
  // A pending invitee holds no admin access yet. Show the access they were
  // offered so the list reads sensibly, but never as though it were live.
  const invitationPending = Boolean(user.pendingAdminRole);
  const accessRemoved = Boolean(
    !invitationPending && user.formerAdminScopes?.includes('main'),
  );

  return {
    id: String(user._id),
    _id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.pendingAdminRole || user.role,
    permissions: user.pendingAdminPermissions || user.permissions || [],
    isActive: invitationPending ? false : user.isActive,
    invitationPending,
    accessRemoved,
    requiresPasswordSetup: Boolean(user.requirePasswordChange),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
};

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
  if (
    typeof role === 'string'
    && role !== 'customer'
    && ADMIN_ROLES.includes(role as AdminRole)
  ) {
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
    $and: [
      {
        $or: [
          { role: { $ne: 'customer' } },
          // Customers holding an unaccepted invitation belong on the list so
          // the invite stays visible and can be resent or withdrawn.
          { pendingAdminRole: { $exists: true } },
          { formerAdminScopes: 'main' },
        ],
      },
      {
        $or: [
          { adminPortalScopes: 'main' },
          { pendingAdminScopes: 'main' },
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
    const {
      firstName,
      lastName,
      email,
      role = 'operations',
      permissions,
    } = body;

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
    let existingAccountInvitation = false;
    let user;

    if (existing) {
      if (
        existing.role !== 'customer'
        && hasPortalMembership(existing, 'main')
      ) {
        return NextResponse.json(
          { success: false, error: 'This account already has access to the EEO Main portal.' },
          { status: 409 },
        );
      }
      if (existing.pendingAdminRole && existing.invitationExpires && existing.invitationExpires > new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: 'A team invitation is already pending for this account. Use Resend invite instead.',
          },
          { status: 409 },
        );
      }

      // Offer the role, do not grant it. Existing customer/admin identity,
      // password and current portal access remain unchanged until acceptance.
      user = await User.findOneAndUpdate(
        {
          _id: existing._id,
          ...(existing.isActive ? { isActive: true } : { isActive: false }),
          $or: [
            { pendingAdminRole: { $exists: false } },
            { invitationExpires: { $lte: new Date() } },
          ],
        },
        {
          $set: {
            invitationToken,
            invitationExpires,
            pendingAdminRole: normalizedRole,
            pendingAdminPermissions: effectivePermissions,
            pendingAdminScopes: ['main'],
            pendingAdminInvitedAt: new Date(),
            pendingAdminInvitedBy: auth.email || 'Admin Team',
          },
        },
        { new: true, runValidators: true },
      );
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'The existing account changed. Refresh and try again.' },
          { status: 409 },
        );
      }
      existingAccountInvitation = true;
    } else {
      // New invitees are also represented as pending. They receive an unusable
      // random password and no admin role/scope until acceptance.
      const temporaryPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      user = await User.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'customer',
        permissions: [],
        isActive: false, // Inactive until they accept invitation
        invitationToken,
        invitationExpires,
        requirePasswordChange: true,
        pendingAdminRole: normalizedRole,
        pendingAdminPermissions: effectivePermissions,
        pendingAdminScopes: ['main'],
        pendingAdminInvitedAt: new Date(),
        pendingAdminInvitedBy: auth.email || 'Admin Team',
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
      console.error('Failed to send admin invite email, rolling back invitation:', emailError);
      if (existingAccountInvitation) {
        // Withdraw only the invitation this request wrote. The customer's
        // identity, bookings and profile must survive an email outage.
        await User.updateOne(
          { _id: user._id, invitationToken },
          {
            $unset: {
              invitationToken: 1,
              invitationExpires: 1,
              ...clearPendingAdminGrant(1),
            },
          },
        );
      } else {
        await User.findOneAndDelete({ _id: user._id, invitationToken });
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
        existingAccountInvitation,
        convertedExistingCustomer: existingAccountInvitation,
      },
      { status: existingAccountInvitation ? 200 : 201 },
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
