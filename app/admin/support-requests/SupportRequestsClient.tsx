'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Loader2, RefreshCw } from 'lucide-react';

type SupportRequest = {
  id: string;
  requestId: string;
  bookingId: string;
  bookingReference: string;
  actionKind: string;
  customerRequest: string;
  language: string;
  channel: string;
  status: 'received' | 'in_progress' | 'resolved' | 'withdrawn';
  proposedAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
};

const KIND_LABEL: Record<string, string> = {
  request_pickup_change: 'Pickup change',
  request_booking_change: 'Booking change',
  request_cancellation: 'Cancellation request',
  request_human_callback: 'Callback request',
  resend_voucher: 'Resend voucher',
};

type State =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; requests: SupportRequest[]; nextCursor: string | null; filter: string };

export default function SupportRequestsClient() {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [filter, setFilter] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: string, cursor?: string | null, existing?: SupportRequest[]) => {
    try {
      const query = new URLSearchParams();
      if (status) query.set('status', status);
      if (cursor) query.set('cursor', cursor);
      const res = await fetch(`/api/admin/support-requests?${query.toString()}`, { cache: 'no-store', headers: { Authorization: 'Bearer cookie-session' } });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = (await res.json()) as { requests: SupportRequest[]; nextCursor: string | null };
      setState({ phase: 'ready', requests: [...(existing ?? []), ...body.requests], nextCursor: body.nextCursor, filter: status });
    } catch {
      setState({ phase: 'error', message: 'Support requests could not be loaded. Retry in a moment.' });
    }
  }, []);

  useEffect(() => {
    // Deferred like the bookings page: keeps the initial fetch out of the synchronous effect body.
    const timeoutId = window.setTimeout(() => void load(filter), 0);
    return () => window.clearTimeout(timeoutId);
  }, [filter, load]);

  const progress = useCallback(async (requestId: string, status: 'in_progress' | 'resolved') => {
    setBusy(requestId);
    setError(null);
    const note = status === 'resolved' ? window.prompt('Resolution note for the record (optional)') ?? '' : '';
    try {
      const res = await fetch('/api/admin/support-requests', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', Authorization: 'Bearer cookie-session' },
        body: JSON.stringify({ requestId, status, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Update failed');
      await load(filter);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }, [filter, load]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900"><ClipboardList className="h-6 w-6 text-red-600" /> Support requests</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Requests customers made to the support assistant and the support desk approved. Nothing here has been applied to a booking yet — action it in
            the booking, then mark it resolved.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Open (received + in progress)</option>
            <option value="received">Received</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
          <button type="button" onClick={() => { setState({ phase: 'loading' }); void load(filter); }} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      {state.phase === 'loading' && <div className="mt-8 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
      {state.phase === 'error' && <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">{state.message}</div>}

      {state.phase === 'ready' && state.requests.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">No support requests</p>
          <p className="mt-1 text-sm text-gray-500">Approved requests from the support desk appear here with the booking reference and the customer&apos;s words.</p>
        </div>
      )}

      {state.phase === 'ready' && state.requests.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Customer said</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.requests.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap"><Link href={`/admin/bookings/${r.bookingId}`} className="font-medium text-red-700 hover:underline">{r.bookingReference}</Link><div className="text-xs text-gray-500">{r.channel} · {r.language}</div></td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{KIND_LABEL[r.actionKind] ?? r.actionKind}</td>
                  <td className="px-4 py-3 max-w-md text-gray-700">{r.customerRequest}{r.resolutionNote ? <div className="mt-1 text-xs text-gray-500">Note: {r.resolutionNote}</div> : null}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{r.status.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{r.confirmedAt ? new Date(r.confirmedAt).toLocaleString() : '—'}<div>{r.confirmedBy ?? ''}</div></td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {r.status === 'received' && <button type="button" disabled={busy === r.requestId} onClick={() => void progress(r.requestId, 'in_progress')} className="mr-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50">Start</button>}
                    {(r.status === 'received' || r.status === 'in_progress') && <button type="button" disabled={busy === r.requestId} onClick={() => void progress(r.requestId, 'resolved')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">Resolve</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {state.nextCursor && (
            <div className="border-t border-gray-100 p-3 text-center">
              <button type="button" onClick={() => void load(state.filter, state.nextCursor, state.requests)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">Load more</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
