'use client';

import { ShieldAlert } from 'lucide-react';

interface AccessDeniedProps {
  requiredPermissions?: string[];
}

export const AccessDenied = ({ requiredPermissions }: AccessDeniedProps) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white border border-red-100 rounded-2xl shadow-lg shadow-red-50 px-8 py-10 text-center max-w-lg">
        <div className="mx-auto mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-3">Access restricted</h2>
        <p className="text-slate-600">
          You do not have permission to view this section. Please contact an administrator if you
          believe this is a mistake.
        </p>
        {requiredPermissions && requiredPermissions.length > 0 && (
          <div className="mt-4 text-xs text-slate-500">
            Required permissions:{' '}
            <span className="font-semibold text-slate-700">
              {requiredPermissions.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessDenied;

