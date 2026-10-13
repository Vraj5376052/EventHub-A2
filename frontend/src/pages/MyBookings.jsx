import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const formatDateTime = (value) => new Date(value).toLocaleString('en-AU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ id: '', type: '', text: '' });

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/bookings/mine', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setBookings(res.data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const cancel = async (bookingId) => {
    setMsg({ id: '', type: '', text: '' });
    setBusy(bookingId);
    try {
      const res = await axiosInstance.patch(
        `/api/bookings/${bookingId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setMsg({
        id: bookingId,
        type: 'success',
        text: `Booking cancelled. ${res.data.refund.policy}, $${res.data.refund.amount.toFixed(2)} refunded.`,
      });
      setConfirming('');
      await load();
    } catch (err) {
      setMsg({
        id: bookingId,
        type: 'error',
        text: err.response?.data?.message || 'Could not cancel. Please try again.',
      });
    } finally {
      setBusy('');
    }
  };

  if (!user) {
    return (
      <div className="page-narrow">
        <div className="empty-state">
          <p className="font-medium text-slate-700">Please log in to see your bookings.</p>
        </div>
      </div>
    );
  }

  const active = bookings.filter((b) => b.status !== 'cancelled').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My bookings</h1>
          <p className="muted mt-1">
            {loading
              ? 'Loading your bookings'
              : `${bookings.length} booking${bookings.length === 1 ? '' : 's'}, ${active} active`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((row) => (
            <div key={row} className="card p-5">
              <div className="skeleton h-5 w-1/3 mb-3" />
              <div className="skeleton h-4 w-1/4 mb-2" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <p className="font-medium text-slate-700 mb-1">You have no bookings yet.</p>
          <p className="muted">Anything you book will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const ev = b.eventId;
            const cancelled = b.status === 'cancelled';

            return (
              <article key={b._id} className={`card p-5 ${cancelled ? 'opacity-70' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2>{ev?.title || 'Event unavailable'}</h2>
                    {ev && <p className="muted">{ev.venue}</p>}
                    {ev && <p className="muted">{formatDateTime(ev.startsAt)}</p>}
                    <p className="text-xs text-slate-400 mt-2 font-mono">{b.reference}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-900">
                      {b.quantity} ticket{b.quantity === 1 ? '' : 's'}
                    </p>
                    {ev && (
                      <p className="muted">${(ev.price * b.quantity).toFixed(2)}</p>
                    )}
                    <span className={`mt-2 ${cancelled ? 'badge-danger' : 'badge-success'}`}>
                      {cancelled ? 'Cancelled' : 'Confirmed'}
                    </span>
                  </div>
                </div>

                {cancelled && b.refundAmount > 0 && (
                  <p className="muted mt-4 pt-4 border-t border-slate-100">
                    ${b.refundAmount.toFixed(2)} was refunded.
                  </p>
                )}

                {!cancelled && confirming !== b._id && (
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-5 border-t border-slate-100">
                    <p className="muted flex-1 min-w-[16rem]">
                      {b.refundPreview
                        ? `Cancel now and you get $${b.refundPreview.amount.toFixed(2)} back, ${b.refundPreview.policy.toLowerCase()}.`
                        : 'This event has already started, so it can no longer be cancelled.'}
                    </p>
                    {b.refundPreview && (
                      <button onClick={() => setConfirming(b._id)} className="btn-danger btn-sm">
                        Cancel booking
                      </button>
                    )}
                  </div>
                )}

                {!cancelled && confirming === b._id && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <div className="alert bg-amber-50 border border-amber-200 text-amber-900 mb-3">
                      Cancel this booking? {b.refundPreview.policy} of{' '}
                      <span className="font-semibold">
                        ${b.refundPreview.amount.toFixed(2)}
                      </span>{' '}
                      will be issued, and {b.quantity} seat
                      {b.quantity === 1 ? '' : 's'} will go back on sale.
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => cancel(b._id)}
                        disabled={busy === b._id}
                        className="btn-danger"
                      >
                        {busy === b._id ? 'Cancelling' : 'Yes, cancel it'}
                      </button>
                      <button onClick={() => setConfirming('')} className="btn-secondary">
                        Keep it
                      </button>
                    </div>
                  </div>
                )}

                {msg.id === b._id && (
                  <p className={`mt-4 ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {msg.text}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;