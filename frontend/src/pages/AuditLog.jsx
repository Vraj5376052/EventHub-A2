import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

// FR-10, US-4.3. The admin view of the audit trail.
//
// Read only, deliberately. There is no edit or delete control on this page
// because there is no endpoint behind one: the trail is append only (NFR-04).

const ACTIONS = [
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'EVENT_CREATED',
  'EVENT_UPDATED',
  'EVENT_CANCELLED',
];

const actionBadge = (action) => {
  if (action.endsWith('CANCELLED')) return 'badge-danger';
  if (action.endsWith('UPDATED')) return 'badge-warning';
  if (action.endsWith('CREATED')) return 'badge-success';
  return 'badge-neutral';
};

const AuditLog = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // As with Browse Events, the full placeholder is for the first paint only.
  // Refiltering dims the table in place instead of tearing it down.
  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await axiosInstance.get('/api/admin/audit', {
        headers: { Authorization: `Bearer ${user.token}` },
        params: action ? { action } : {},
      });
      setEntries(res.data.entries);
      setStats(res.data.logger);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? 'The audit trail is available to administrators only.'
          : 'The audit trail could not be loaded.'
      );
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, action]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) {
    return (
      <div className="page-narrow">
        <div className="empty-state">
          <p className="font-medium text-slate-700">Please log in to view the audit trail.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header animate-up">
        <div>
          <h1>Audit trail</h1>
          <p className="muted mt-1">
            Append only. Entries can be read and filtered, never edited or removed.
          </p>
        </div>

        <div className="shrink-0">
          <label className="label" htmlFor="audit-action">Filter by action</label>
          <select
            id="audit-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="input w-56"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* A rising failure count means writes were dropped and the trail has
          gaps, which is the one thing a reader of an audit log must know. */}
      {stats && (
        <div className="animate-up mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3" style={{ '--d': '70ms' }}>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Entries shown</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{entries.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Written this run</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.writeCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Writes lost</p>
            <p className={`mt-1 text-2xl font-bold ${stats.failureCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {stats.failureCount}
            </p>
          </div>
        </div>
      )}

      {error && <p className="alert-error mb-6">{error}</p>}

      {loading ? (
        <div className="card p-6 space-y-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="skeleton h-9 w-full" />
          ))}
        </div>
      ) : !error && entries.length === 0 ? (
        <div className="empty-state">
          <p className="mb-1 text-base font-semibold text-slate-700">
            {action ? 'No entries for that action.' : 'No entries recorded yet.'}
          </p>
          <p className="muted">
            {action ? 'Try a different filter.' : 'Activity will appear here as it happens.'}
          </p>
        </div>
      ) : entries.length > 0 && (
        <div className={`card animate-up overflow-hidden transition-opacity ${refreshing ? 'opacity-50' : ''}`} style={{ '--d': '120ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">When</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actor</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Target</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Detail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry._id}
                    className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-indigo-50/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{entry.actorEmail}</td>
                    <td className="px-4 py-3">
                      <span className="badge-neutral capitalize">{entry.actorRole}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={actionBadge(entry.action)}>{entry.action}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700">{entry.targetType}</span>{' '}
                      <span className="font-mono text-xs text-slate-400">{entry.targetId}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{entry.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats?.lastError && (
        <p className="muted mt-4">Last logger error: {stats.lastError}</p>
      )}
    </div>
  );
};

export default AuditLog;