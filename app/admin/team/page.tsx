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
} from 'lucide-react';
import withAuth from '@/components/admin/withAuth';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { ADMIN_PERMISSIONS } from '@/lib/constants/adminPermissions';

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

const permissionLabels: Record<string, string> = {
  manageDashboard: 'Dashboard',
  manageBookings: 'Bookings',
  manageTours: 'Tours',
  managePricing: 'Pricing',
  manageContent: 'Content',
  manageDiscounts: 'Discounts',
  manageUsers: 'Users',
  manageReports: 'Reports',
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
    password: '',
    role: 'operations',
    permissions: ['manageBookings'],
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
      const data = await response.json();
      setMembers(data.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Unable to load team');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team member');
      }

      toast.success('Team member added');
      setMembers((prev) => [data.data, ...prev]);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'operations',
        permissions: ['manageBookings'],
      });
    } catch (error: any) {
      toast.error(error.message || 'Unable to add member');
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
        const data = await response.json();
        throw new Error(data.error || 'Failed to update member');
      }
      toast.success('Team member updated');
    } catch (error: any) {
      toast.error(error.message || 'Unable to update member');
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
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }
      toast.success(`Access ${member.isActive ? 'revoked' : 'restored'}`);
    } catch (error: any) {
      toast.error(error.message || 'Unable to change status');
      setMembers((prev) =>
        prev.map((item) =>
          item._id === member._id ? { ...item, isActive: previous } : item,
        ),
      );
    }
  };

  const deleteMember = async (member: TeamMember) => {
    if (!token) return;
    
    const confirmMessage = `Are you sure you want to permanently delete ${member.firstName} ${member.lastName}?\n\nThis action cannot be undone and will remove all their access.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await authorizedFetch(`/api/admin/team/${member._id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete member');
      }
      
      setMembers((prev) => prev.filter((item) => item._id !== member._id));
      toast.success(`${member.firstName} ${member.lastName} has been deleted`);
    } catch (error: any) {
      toast.error(error.message || 'Unable to delete member');
    }
  };

  const activeMembers = useMemo(
    () => members.filter((member) => member.isActive),
    [members],
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Team access</h1>
              <p className="text-slate-500">
                Grant granular permissions to your operations and content teams.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Active team</p>
          <p className="text-2xl font-semibold text-slate-900">
            {activeMembers.length} <span className="text-sm text-slate-500">/ {members.length}</span>
          </p>
          <p className="text-xs text-slate-400">
            Managed by {user?.firstName || 'you'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleInvite}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 lg:col-span-1"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-500">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Invite teammate</h2>
              <p className="text-sm text-slate-500">Create secure access for someone new</p>
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
            <label className="text-xs text-slate-500 font-medium">Temporary password</label>
            <input
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              placeholder="Minimum 8 characters"
            />
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

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Current team</h2>
              <p className="text-sm text-slate-500">
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
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="border border-slate-200 rounded-2xl p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold">
                        {member.firstName?.charAt(0).toUpperCase() || 'T'}
                      </div>
                      <div>
                        <p className="text-slate-900 font-semibold">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase text-slate-400 mb-2">
                      Permissions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ADMIN_PERMISSIONS.map((permission) => {
                        const active = member.permissions.includes(permission);
                        return (
                          <button
                            key={permission}
                            onClick={() => togglePermission(member, permission)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                              active
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {permissionLabels[permission] || permission}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStatus(member)}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition ${
                        member.isActive
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={member.isActive ? 'Temporarily revoke access' : 'Restore access'}
                    >
                      {member.isActive ? (
                        <>
                          <Lock className="h-4 w-4" /> Revoke access
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4" /> Restore
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deleteMember(member)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition"
                      title="Permanently delete this team member"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withAuth(TeamPage, { permissions: ['manageUsers'] });

