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
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('date');
  const [eligibleEventIds, setEligibleEventIds] = useState([]);
  const [reviewRatings, setReviewRatings] = useState({});
  const [reviewComments, setReviewComments] = useState({});
  const [reviewBusy, setReviewBusy] = useState('');
  const [reviewMsg, setReviewMsg] = useState({ id: '', type: '', text: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get('/api/events', {
        params: {
          keyword: keyword || undefined,
          category: category || undefined,
          sort: sortOrder,
        },
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setEvents(res.data);

      if (user.role === 'customer') {
        try {
          const bookingsRes = await axiosInstance.get('/api/bookings/mine', {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          const eligibleIds = bookingsRes.data
            .filter((booking) => booking.status === 'confirmed'
              && booking.eventId
              && new Date(booking.eventId.startsAt) <= new Date())
            .map((booking) => booking.eventId._id);
          setEligibleEventIds([...new Set(eligibleIds)]);
        } catch {
          setEligibleEventIds([]);
        }
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user, keyword, category, sortOrder]);

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

  const submitReview = async (eventId) => {
    setReviewMsg({ id: '', type: '', text: '' });
    setReviewBusy(eventId);
    try {
      await axiosInstance.post(
        `/api/events/${eventId}/reviews`,
        { rating: Number(reviewRatings[eventId] || 5), comment: reviewComments[eventId] || '' },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setReviewMsg({ id: eventId, type: 'success', text: 'Your review was submitted.' });
      await load();
    } catch (err) {
      setReviewMsg({
        id: eventId,
        type: 'error',
        text: err.response?.data?.message || 'Could not submit your review. Please try again.',
      });
    } finally {
      setReviewBusy('');
    }
  };

  if (!user) return <p className="text-center mt-20">Please log in.</p>;
  if (loading) return <p className="text-center mt-20">Loading events…</p>;

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold mb-4">Browse Events</h1>

<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
  <input
    type="text"
    value={keyword}
    onChange={(e) => setKeyword(e.target.value)}
    placeholder="Search title or venue"
    className="border rounded px-3 py-2"
  />

  <input
    type="text"
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    placeholder="Category"
    className="border rounded px-3 py-2"
  />

  <select
    id="event-sort"
    value={sortOrder}
    onChange={(e) => setSortOrder(e.target.value)}
    className="border rounded px-3 py-2"
  >
    <option value="date">Date</option>
    <option value="price">Price</option>
    <option value="seatsRemaining">Seats remaining</option>
  </select>
</div>

      {events.length === 0 ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          <p className="mb-2">No events available.</p>
          <p className="text-sm">Check back soon — organisers are still adding events.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => {
            const remaining = ev.capacity - ev.bookedSeats;
            const soldOut = remaining <= 0;
            const userId = user.id || user._id;
            const hasReviewed = ev.reviews?.some((review) =>
              String(review.reviewerId?._id || review.reviewerId) === String(userId)
            );
            return (
              <div key={ev._id} className="bg-white p-4 rounded shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">{ev.title}</h2>
                    {ev.category && (
  <p className="text-gray-500 text-xs capitalize">{ev.category}</p>
)}
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

                {ev.reviews?.length > 0 && (
                  <section className="mt-4 pt-4 border-t" aria-label={`Reviews for ${ev.title}`}>
                    <h3 className="text-sm font-semibold mb-3">Customer reviews ({ev.reviews.length})</h3>
                    <div className="space-y-3">
                      {ev.reviews.map((review) => (
                        <article key={review._id} className="text-sm">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-amber-600" aria-label={`${review.rating} out of 5 stars`}>
                              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </span>
                            <span className="font-medium">{review.reviewerId?.name || 'Customer'}</span>
                            <time className="text-gray-500" dateTime={review.createdAt}>
                              {new Date(review.createdAt).toLocaleDateString('en-AU', { dateStyle: 'medium' })}
                            </time>
                          </div>
                          {review.comment && <p className="text-gray-700 mt-1">{review.comment}</p>}
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {user.role === 'customer' && eligibleEventIds.includes(ev._id) && (
                  hasReviewed ? (
                    <p className="mt-4 pt-4 border-t text-sm text-green-700">You reviewed this event.</p>
                  ) : (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-2">Leave a review</h3>
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="text-sm">
                          <span className="block mb-1">Rating</span>
                          <select
                            value={reviewRatings[ev._id] || 5}
                            onChange={(e) => setReviewRatings({ ...reviewRatings, [ev._id]: e.target.value })}
                            className="border rounded px-3 py-2"
                          >
                            {[5, 4, 3, 2, 1].map((rating) => (
                              <option key={rating} value={rating}>{rating} star{rating === 1 ? '' : 's'}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm flex-1 min-w-48">
                          <span className="block mb-1">Comment (optional)</span>
                          <textarea
                            maxLength={500}
                            rows={2}
                            value={reviewComments[ev._id] || ''}
                            onChange={(e) => setReviewComments({ ...reviewComments, [ev._id]: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                          />
                        </label>
                        <button
                          onClick={() => submitReview(ev._id)}
                          disabled={reviewBusy === ev._id}
                          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
                        >
                          {reviewBusy === ev._id ? 'Submitting…' : 'Submit review'}
                        </button>
                      </div>
                      {reviewMsg.id === ev._id && (
                        <p className={`mt-2 text-sm ${reviewMsg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                          {reviewMsg.text}
                        </p>
                      )}
                    </div>
                  )
                )}

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
