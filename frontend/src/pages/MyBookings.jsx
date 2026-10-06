import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

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

  if (!user) return <p className="text-center mt-20">Please log in.</p>;
  if (loading) return <p className="text-center mt-20">Loading your bookings…</p>;

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          <p className="mb-2">You have no bookings yet.</p>
          <p className="text-sm">Anything you book will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const ev = b.eventId;
            const cancelled = b.status === 'cancelled';
            return (
              <div key={b._id} className={`bg-white p-4 rounded shadow ${cancelled ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">{ev?.title || 'Event unavailable'}</h2>
                    {ev && <p className="text-gray-600 text-sm">{ev.venue}</p>}
                    {ev && (
                      <p className="text-gray-600 text-sm">
                        {new Date(ev.startsAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs mt-2">Reference {b.reference}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold">{b.quantity} ticket{b.quantity === 1 ? '' : 's'}</p>
                    {ev && <p className="text-sm text-gray-600">${(ev.price * b.quantity).toFixed(2)}</p>}
                    <span className={`inline-block mt-2 text-sm font-medium ${cancelled ? 'text-red-600' : 'text-green-700'}`}>
                      {cancelled ? 'Cancelled' : 'Confirmed'}
                    </span>
                  </div>
                </div>

                {cancelled && b.refundAmount > 0 && (
                  <p className="text-sm text-gray-600 mt-3 pt-3 border-t">
                    ${b.refundAmount.toFixed(2)} was refunded.
                  </p>
                )}

                {!cancelled && confirming !== b._id && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      {b.refundPreview
                        ? `Cancel now and you get $${b.refundPreview.amount.toFixed(2)} back (${b.refundPreview.policy.toLowerCase()}).`
                        : 'This event has already started, so it can no longer be cancelled.'}
                    </p>
                    {b.refundPreview && (
                      <button
                        onClick={() => setConfirming(b._id)}
                        className="bg-red-600 text-white px-4 py-2 rounded shrink-0 ml-4"
                      >
                        Cancel booking
                      </button>
                    )}
                  </div>
                )}

                {!cancelled && confirming === b._id && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm mb-3">
                      Cancel this booking? {b.refundPreview.policy} of{' '}
                      <span className="font-semibold">${b.refundPreview.amount.toFixed(2)}</span>{' '}
                      will be issued, and {b.quantity} seat{b.quantity === 1 ? '' : 's'} will go back on sale.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => cancel(b._id)}
                        disabled={busy === b._id}
                        className="bg-red-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
                      >
                        {busy === b._id ? 'Cancelling…' : 'Yes, cancel it'}
                      </button>
                      <button onClick={() => setConfirming('')} className="px-4 py-2 rounded border">
                        Keep it
                      </button>
                    </div>
                  </div>
                )}

                {msg.id === b._id && (
                  <p className={`mt-3 text-sm ${msg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                    {msg.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;