import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  AdminPermission,
  AdminRole,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';
import { EmailService } from '@/lib/email/emailService';

const sanitize = (user: any) => ({
  id: user._id.toString(),
  _id: user._id.toString(),
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

const getPortalLink = () => {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://tourticket.app';
  return `${base.replace(/\/$/, '')}/admin`;
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

  const teamMembers = await User.find({ role: { $ne: 'customer' } })
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

  await dbConnect();

  const body = await request.json();
  const { firstName, lastName, email, password, role = 'operations', permissions } = body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { success: false, error: 'First name, last name, email, and password are required.' },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: 'Password must be at least 8 characters long.' },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'An account with this email already exists.' },
      { status: 409 },
    );
  }

  const normalizedRole = normalizeRole(role);

  const hashedPassword = await bcrypt.hash(password, 10);
  const effectivePermissions = normalizePermissions(permissions, normalizedRole);

  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    password: hashedPassword,
    role: normalizedRole,
    permissions: effectivePermissions,
    isActive: true,
  });

  const inviteeName = `${firstName} ${lastName}`.trim();
  const inviterName = auth.email || 'Admin Team';

  EmailService.sendAdminInviteEmail({
    inviteeName: inviteeName || normalizedEmail,
    inviteeEmail: normalizedEmail,
    inviterName,
    temporaryPassword: password,
    role: normalizedRole,
    permissions: effectivePermissions,
    portalLink: getPortalLink(),
    supportEmail: getSupportEmail(),
  }).catch((error) => {
    console.error('Failed to send admin invite email', error);
  });

  return NextResponse.json(
    { success: true, data: sanitize(user) },
    { status: 201 },
  );
}

