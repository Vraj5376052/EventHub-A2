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

const AuditLog = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
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
    }
  }, [user, action]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return <p className="p-6">Please sign in.</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Audit trail</h1>
      <p className="text-sm text-gray-500 mb-4">
        Append only. Entries can be read and filtered, never edited or removed.
      </p>

      <label className="block mb-4 text-sm">
        <span className="mr-2">Filter by action</span>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>

      {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
      {loading && <p className="text-gray-500">Loading…</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-gray-500">No entries recorded yet.</p>
      )}

      {!loading && entries.length > 0 && (
        <table className="w-full text-sm border">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 border-b">When</th>
              <th className="p-2 border-b">Actor</th>
              <th className="p-2 border-b">Role</th>
              <th className="p-2 border-b">Action</th>
              <th className="p-2 border-b">Target</th>
              <th className="p-2 border-b">Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry._id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border-b whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="p-2 border-b">{entry.actorEmail}</td>
                <td className="p-2 border-b">{entry.actorRole}</td>
                <td className="p-2 border-b font-mono text-xs">{entry.action}</td>
                <td className="p-2 border-b font-mono text-xs">
                  {entry.targetType} {entry.targetId}
                </td>
                <td className="p-2 border-b text-gray-600">{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* A rising failure count means writes were dropped and the trail has
          gaps, which is the one thing a reader of an audit log must know. */}
      {stats && (
        <p className="text-xs text-gray-500 mt-4">
          Logger: {stats.writeCount} written, {stats.failureCount} failed this run
          {stats.lastError ? ` (last error: ${stats.lastError})` : ''}.
        </p>
      )}
    </div>
  );
};

export default AuditLog;
