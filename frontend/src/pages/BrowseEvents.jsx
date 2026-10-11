import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const BrowseEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ id: '', type: '', text: '' });
  const [sortOrder, setSortOrder] = useState('soonest');

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/events', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setEvents(res.data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const book = async (eventId) => {
    setMsg({ id: '', type: '', text: '' });
    setBusy(eventId);
    try {
      const res = await axiosInstance.post(
        '/api/bookings',
        { eventId, quantity: Number(qty[eventId] || 1) },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setMsg({ id: eventId, type: 'success', text: `Booking confirmed. Your reference is ${res.data.booking.reference}` });
      await load();
    } catch (err) {
      setMsg({ id: eventId, type: 'error', text: err.response?.data?.message || 'Could not book. Please try again.' });
    } finally {
      setBusy('');
    }
  };

  if (!user) return <p className="text-center mt-20">Please log in.</p>;

  const sortedEvents = [...events].sort((a, b) => {
  const firstDate = new Date(a.startsAt);
  const secondDate = new Date(b.startsAt);

  return sortOrder === 'latest'
    ? secondDate - firstDate
    : firstDate - secondDate;
});
  if (loading) return <p className="text-center mt-20">Loading events…</p>;

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
     <div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold">Browse Events</h1>

  <div className="flex items-center gap-2">
    <label htmlFor="event-sort" className="text-sm font-medium">
      Sort by
    </label>

    <select
      id="event-sort"
      value={sortOrder}
      onChange={(e) => setSortOrder(e.target.value)}
      className="border rounded px-3 py-2"
    >
      <option value="soonest">Soonest first</option>
      <option value="latest">Latest first</option>
    </select>
  </div>
</div>

      {events.length === 0 ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          <p className="mb-2">No events available.</p>
          <p className="text-sm">Check back soon — organisers are still adding events.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((ev) => {
            const remaining = ev.capacity - ev.bookedSeats;
            const soldOut = remaining <= 0;
            return (
              <div key={ev._id} className="bg-white p-4 rounded shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">{ev.title}</h2>
                    <p className="text-gray-600 text-sm">{ev.venue}</p>
                    <p className="text-gray-600 text-sm">
                      {new Date(ev.startsAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {ev.description && <p className="text-gray-700 text-sm mt-2">{ev.description}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold">${ev.price}</p>
                    {soldOut ? (
                      <span className="inline-block mt-2 text-sm text-red-600 font-medium">Sold out</span>
                    ) : (
                      <span className="inline-block mt-2 text-sm text-gray-600">
                        {remaining} seat{remaining === 1 ? '' : 's'} left
                      </span>
                    )}
                  </div>
                </div>

                {user.role === 'customer' && !soldOut && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <label className="text-sm">Tickets</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={qty[ev._id] || 1}
                      onChange={(e) => setQty({ ...qty, [ev._id]: e.target.value })}
                      className="w-20 p-2 border rounded"
                    />
                    <button
                      onClick={() => book(ev._id)}
                      disabled={busy === ev._id}
                      className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
                    >
                      {busy === ev._id ? 'Booking…' : 'Book'}
                    </button>
                  </div>
                )}

                {msg.id === ev._id && (
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

export default BrowseEvents;
