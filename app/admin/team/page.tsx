'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Shield,
  Mail,
  UserPlus,
  Loader2,
  Lock,
  Unlock,
  Trash2,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import withAuth from '@/components/admin/withAuth';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { ADMIN_PERMISSIONS } from '@/lib/constants/adminPermissions';
import { readJsonResponse } from '@/lib/http/readJsonResponse';

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  /** Invited but not yet accepted — holds no access on this portal yet. */
  invitationPending?: boolean;
  /** Admin access was removed, while the underlying account was preserved. */
  accessRemoved?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const permissionLabels: Record<string, string> = {
  manageDashboard: 'Dashboard',
  manageBookings: 'Bookings',
  manageTours: 'Tours',
  managePricing: 'Pricing',
  managePayments: 'Payment Settings',
  manageContent: 'Content',
  manageDiscounts: 'Discounts',
  manageUsers: 'Users',
  manageReports: 'Reports',
  manageAudit: 'Audit',
};

const TeamPage = () => {
  const { token, user } = useAdminAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'operations',
    permissions: ['manageBookings'],
  });

  // Password reset modal state
  const [passwordResetModal, setPasswordResetModal] = useState<{
    isOpen: boolean;
    member: TeamMember | null;
    newPassword: string;
    showPassword: boolean;
    isResetting: boolean;
  }>({
    isOpen: false,
    member: null,
    newPassword: '',
    showPassword: false,
    isResetting: false,
  });

  const authorizedFetch = async (input: RequestInfo, init: RequestInit = {}) => {
    if (!token) throw new Error('Missing admin token');
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (!(init.body instanceof FormData)) {
      headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
    }
    return fetch(input, { ...init, headers });
  };

  const fetchMembers = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await authorizedFetch('/api/admin/team');
      if (!response.ok) {
        throw new Error('Failed to load team members');
      }
      const data = await readJsonResponse<{ data?: TeamMember[] }>(
        response,
        'Failed to load team members.',
      );
      setMembers(data.data || []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Unable to load team'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      queueMicrotask(() => void fetchMembers());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsInviting(true);
    try {
      const response = await authorizedFetch('/api/admin/team', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      const data = await readJsonResponse<{
        data: TeamMember;
        error?: string;
        existingAccountInvitation?: boolean;
        convertedExistingCustomer?: boolean;
      }>(response, 'Unable to invite this teammate. Please try again.');
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team member');
      }

      toast.success(
        data.existingAccountInvitation || data.convertedExistingCustomer
          ? 'Invitation sent. The existing account remains unchanged until it is accepted.'
          : 'Secure invitation sent. Access begins only after it is accepted.',
      );
      setMembers((prev) => [data.data, ...prev]);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'operations',
        permissions: ['manageBookings'],
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Unable to add member'));
    } finally {
      setIsInviting(false);
    }
  };

  const updateMember = async (memberId: string, updates: Partial<TeamMember>) => {
    if (!token) return;
    const previous = members;
    setMembers((prev) =>
      prev.map((member) =>
        member._id === memberId ? { ...member, ...updates } : member,
      ),
    );

    try {
      const response = await authorizedFetch(`/api/admin/team/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await readJsonResponse<{ error?: string }>(
          response,
          'Failed to update member.',
        );
        throw new Error(data.error || 'Failed to update member');
      }
      toast.success('Team member updated');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Unable to update member'));
      setMembers(previous);
    }
  };

  const togglePermission = (member: TeamMember, permission: string) => {
    const permissions = member.permissions.includes(permission)
      ? member.permissions.filter((p) => p !== permission)
      : [...member.permissions, permission];
    updateMember(member._id, { permissions });
  };

  const toggleStatus = async (member: TeamMember) => {
    if (!token) return;
    const previous = member.isActive;
    setMembers((prev) =>
      prev.map((item) =>
        item._id === member._id ? { ...item, isActive: !item.isActive } : item,
      ),
    );
    try {
      const response = await authorizedFetch(`/api/admin/team/${member._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      if (!response.ok) {
        const data = await readJsonResponse<{ error?: string }>(
          response,
          'Failed to update status.',
        );
        throw new Error(data.error || 'Failed to update status');
      }
      toast.success(`Access ${member.isActive ? 'revoked' : 'restored'}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Unable to change status'));
      setMembers((prev) =>
        prev.map((item) =>
          item._id === member._id ? { ...item, isActive: previous } : item,
        ),
      );
    }
  };

  const removeMember = async (member: TeamMember) => {
    if (!token) return;

    const name = `${member.firstName} ${member.lastName}`.trim();
    const confirmMessage = member.invitationPending
      ? `Withdraw the team invitation for ${name}?\n\nTheir customer account, bookings and sign-in are not affected.`
      : `Remove ${name} from the EEO Main team?\n\nThey lose admin access to this portal. Their customer account, bookings and any access to other EEO portals stay exactly as they are.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await authorizedFetch(`/api/admin/team/${member._id}`, {
        method: 'DELETE',
      });

      const data = await readJsonResponse<{ error?: string; message?: string }>(
        response,
        'Failed to remove member.',
      );
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      setMembers((prev) => prev.filter((item) => item._id !== member._id));
      toast.success(data.message || `${name} was removed from the team`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Unable to remove member'));
    }
  };

  const inviteFormerMember = async (member: TeamMember) => {
    if (!token) return;
    if (!confirm(`Send a new secure invitation to ${member.email}?\n\nAccess stays off until they accept and complete two-step verification.`)) return;
    try {
      const response = await authorizedFetch('/api/admin/team', {
        method: 'POST',
        body: JSON.stringify({
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          role: 'operations',
          permissions: member.permissions.length ? member.permissions : ['manageBookings'],
          restoreInactive: true,
        }),
      });
      const data = await readJsonResponse<{ error?: string }>(response, 'Failed to send invitation.');
      if (!response.ok) throw new Error(data.error || 'Failed to send invitation');
      await fetchMembers();
      toast.success('Secure invitation sent. Access begins only after acceptance.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Unable to send invitation'));
    }
  };

  const permanentlyDeleteMember = async (member: TeamMember) => {
    if (!token) return;
    const typed = prompt(
      `Permanently delete ${member.email}?\n\nDeletion is blocked if any business record or other portal access exists.\n\nType DELETE to continue.`,
    );
    if (typed !== 'DELETE') return;
    try {
      const response = await authorizedFetch(`/api/admin/team/${member._id}/permanent`, {
        method: 'DELETE',
      });
      const data = await readJsonResponse<{
        error?: string;
        message?: string;
        dependencies?: Record<string, number>;
      }>(response, 'Failed to permanently delete account.');
      if (!response.ok) {
        const linked = data.dependencies
          ? Object.entries(data.dependencies)
            .filter(([, count]) => count > 0)
            .map(([name, count]) => `${name}: ${count}`)
            .join(', ')
          : '';
        throw new Error(linked ? `${data.error} (${linked})` : data.error || 'Permanent deletion was blocked');
      }
      await fetchMembers();
      toast.success(data.message || 'Account permanently deleted');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Unable to permanently delete account'));
    }
  };

  const handleResetPassword = async () => {
    if (!token || !passwordResetModal.member) return;

    if (passwordResetModal.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setPasswordResetModal((prev) => ({ ...prev, isResetting: true }));

    try {
      const response = await authorizedFetch(`/api/admin/team/${passwordResetModal.member._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: passwordResetModal.newPassword }),
      });

      const data = await readJsonResponse<{ error?: string }>(
        response,
        'Failed to reset password.',
      );
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast.success(`Password reset for ${passwordResetModal.member.firstName} ${passwordResetModal.member.lastName}`);
      setPasswordResetModal({
        isOpen: false,
        member: null,
        newPassword: '',
        showPassword: false,
        isResetting: false,
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Unable to reset password'));
      setPasswordResetModal((prev) => ({ ...prev, isResetting: false }));
    }
  };

  const handleResendInvitation = async (member: TeamMember) => {
    if (!token) return;

    try {
      const response = await authorizedFetch(`/api/admin/team/${member._id}/resend-invitation`, {
        method: 'POST',
      });

      const data = await readJsonResponse<{ error?: string }>(
        response,
        'Failed to resend invitation.',
      );
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend invitation');
      }

      toast.success(`Invitation resent to ${member.email}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Unable to resend invitation'));
    }
  };

  const activeMembers = useMemo(
    () => members.filter(
      (member) => member.isActive && !member.invitationPending && !member.accessRemoved,
    ),
    [members],
  );

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 md:p-3 rounded-2xl bg-indigo-100 text-indigo-600 flex-shrink-0">
              <Shield className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 break-words">Team access</h1>
              <p className="text-sm md:text-base text-slate-500 mt-1">
                Grant granular permissions to your operations and content teams.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 md:px-6 py-3 md:py-4 w-full sm:w-auto text-center sm:text-right flex-shrink-0">
          <p className="text-xs uppercase tracking-wide text-slate-400">Active team</p>
          <p className="text-xl md:text-2xl font-semibold text-slate-900">
            {activeMembers.length} <span className="text-sm text-slate-500">/ {members.length}</span>
          </p>
          <p className="text-xs text-slate-400">
            Managed by {user?.firstName || 'you'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <form
          onSubmit={handleInvite}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6 space-y-4 lg:col-span-1 lg:sticky lg:top-4 lg:self-start"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-500 flex-shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base md:text-lg font-semibold text-slate-900">Invite teammate</h2>
              <p className="text-xs md:text-sm text-slate-500">
                Access stays pending until they accept the secure email invitation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium">First name</label>
              <input
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                placeholder="Sara"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Last name</label>
              <input
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                placeholder="Ahmed"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium">Work email</label>
            <div className="mt-1 relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                type="email"
                required
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                placeholder="teammate@company.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium">Default permissions</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ADMIN_PERMISSIONS.map((permission) => {
                const active = formData.permissions.includes(permission);
                return (
                  <button
                    type="button"
                    key={permission}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        permissions: active
                          ? prev.permissions.filter((p) => p !== permission)
                          : [...prev.permissions, permission],
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      active
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                    }`}
                  >
                    {permissionLabels[permission] || permission}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isInviting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white font-semibold py-2.5 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition disabled:opacity-40"
          >
            {isInviting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating access…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Invite teammate
              </>
            )}
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">Current team</h2>
              <p className="text-xs md:text-sm text-slate-500">
                {members.length} total · {activeMembers.length} currently active
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              Invite your first teammate to get started.
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="border border-slate-200 rounded-2xl p-3 md:p-4 flex flex-col gap-3 md:gap-4"
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold flex-shrink-0">
                      {member.firstName?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm md:text-base text-slate-900 font-semibold truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        {member.invitationPending && (
                          <span
                            className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                            title="Invited, but has not accepted yet. No admin access is active."
                          >
                            Invitation pending — no access yet
                          </span>
                        )}
                        {member.accessRemoved && (
                          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            Access removed — account preserved
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-slate-500 truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400 mb-2">
                      Permissions
                    </p>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {ADMIN_PERMISSIONS.map((permission) => {
                        const active = member.permissions.includes(permission);
                        return (
                          <button
                            key={permission}
                            type="button"
                            disabled={member.invitationPending || member.accessRemoved}
                            onClick={() => togglePermission(member, permission)}
                            className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-medium border transition ${
                              active
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            } ${member.invitationPending || member.accessRemoved ? 'cursor-default opacity-80' : ''}`}
                            title={member.invitationPending
                              ? 'Offered permission. It becomes active only after acceptance.'
                              : member.accessRemoved
                                ? 'This account currently has no admin access.'
                              : 'Update this team member permission'}
                          >
                            {permissionLabels[permission] || permission}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    {member.invitationPending && (
                      <button
                        onClick={() => handleResendInvitation(member)}
                        className="inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition"
                        title="Resend invitation email"
                      >
                        <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4" /> 
                        <span>Resend Invite</span>
                      </button>
                    )}
                    
                    {!member.invitationPending && !member.accessRemoved && (
                    <button
                      onClick={() => setPasswordResetModal({ isOpen: true, member, newPassword: '', showPassword: false, isResetting: false })}
                      className="inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-xl border border-purple-200 text-purple-600 hover:bg-purple-50 transition"
                      title="Reset password for this team member"
                    >
                      <Key className="h-3.5 w-3.5 md:h-4 md:w-4" /> 
                      <span>Reset Password</span>
                    </button>
                    )}

                    {!member.invitationPending && !member.accessRemoved && (
                    <button
                      onClick={() => toggleStatus(member)}
                      className={`inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-xl border transition ${
                        member.isActive
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={member.isActive ? 'Temporarily revoke access' : 'Restore access'}
                    >
                      {member.isActive ? (
                        <>
                          <Lock className="h-3.5 w-3.5 md:h-4 md:w-4" /> 
                          <span className="hidden sm:inline">Revoke access</span>
                          <span className="sm:hidden">Revoke</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3.5 w-3.5 md:h-4 md:w-4" /> 
                          <span>Restore</span>
                        </>
                      )}
                    </button>
                    )}
                    
                    {!member.accessRemoved && (
                    <button
                      onClick={() => removeMember(member)}
                      className="inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition"
                      title={member.invitationPending
                        ? 'Withdraw this invitation. The customer account is not affected.'
                        : 'Remove admin access to this portal. The account, bookings and other portals are not affected.'}
                    >
                      <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span>{member.invitationPending ? 'Withdraw invite' : 'Remove access'}</span>
                    </button>
                    )}
                    {member.accessRemoved && (
                      <button
                        onClick={() => inviteFormerMember(member)}
                        className="inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        Invite again
                      </button>
                    )}
                    {member.accessRemoved && user?.role === 'super_admin' && (
                      <button
                        onClick={() => permanentlyDeleteMember(member)}
                        className="inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition"
                        title="Permanently delete only if there are no linked business records or other portal access"
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        Permanently delete account
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {passwordResetModal.isOpen && passwordResetModal.member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
                <Key className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900">Reset Password</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Set a new password for {passwordResetModal.member.firstName} {passwordResetModal.member.lastName}
                </p>
              </div>
            </div>

            {/* Email Display */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-medium text-slate-500 mb-1">Team Member Email</p>
              <p className="text-sm text-slate-900 font-medium">{passwordResetModal.member.email}</p>
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={passwordResetModal.showPassword ? 'text' : 'password'}
                  value={passwordResetModal.newPassword}
                  onChange={(e) =>
                    setPasswordResetModal((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Enter new password (min 8 characters)"
                  disabled={passwordResetModal.isResetting}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() =>
                    setPasswordResetModal((prev) => ({ ...prev, showPassword: !prev.showPassword }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {passwordResetModal.showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                The user will be able to login immediately with this new password
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setPasswordResetModal({
                    isOpen: false,
                    member: null,
                    newPassword: '',
                    showPassword: false,
                    isResetting: false,
                  })
                }
                disabled={passwordResetModal.isResetting}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={passwordResetModal.isResetting || passwordResetModal.newPassword.length < 8}
                className="flex-1 px-4 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {passwordResetModal.isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(TeamPage, { permissions: ['manageUsers'] });
