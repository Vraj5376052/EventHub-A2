import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const SORT_OPTIONS = [
  { value: 'date', label: 'Date, soonest first' },
  { value: 'price', label: 'Price, lowest first' },
  { value: 'seatsRemaining', label: 'Seats remaining' },
];

const Stars = ({ rating }) => (
  <span aria-label={`${rating} out of 5 stars`}>
    <span className="text-amber-400">{'★'.repeat(rating)}</span>
    <span className="text-slate-300">{'★'.repeat(5 - rating)}</span>
  </span>
);

const formatDateTime = (value) => new Date(value).toLocaleString('en-AU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const BrowseEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ id: '', type: '', text: '' });
  const [keyword, setKeyword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('date');
  const [eligibleEventIds, setEligibleEventIds] = useState([]);
  const [reviewRatings, setReviewRatings] = useState({});
  const [reviewComments, setReviewComments] = useState({});
  const [reviewBusy, setReviewBusy] = useState('');
  const [reviewMsg, setReviewMsg] = useState({ id: '', type: '', text: '' });

  // Wait for a pause in typing before searching, so one request goes out per
  // pause rather than one per character.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Deliberately does not set loading back to true. The placeholder is for the
  // first paint only, because re-rendering it on every refetch unmounted the
  // search box and took the cursor with it.
  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/events', {
        params: {
          keyword: searchTerm || undefined,
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
  }, [user, searchTerm, category, sortOrder]);

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
      setMsg({
        id: eventId,
        type: 'success',
        text: `Booking confirmed. Your reference is ${res.data.booking.reference}`,
      });
      setQty({ ...qty, [eventId]: 1 });
      await load();
    } catch (err) {
      setMsg({
        id: eventId,
        type: 'error',
        text: err.response?.data?.message || 'Could not book. Please try again.',
      });
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
        {
          rating: Number(reviewRatings[eventId] || 5),
          comment: reviewComments[eventId] || '',
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setReviewMsg({ id: eventId, type: 'success', text: 'Thanks, your review is live.' });
      setReviewComments({ ...reviewComments, [eventId]: '' });
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

  if (!user) {
    return (
      <div className="page-narrow">
        <div className="empty-state">
          <p className="font-medium text-slate-700">Please log in to browse events.</p>
        </div>
      </div>
    );
  }

  const filtersApplied = Boolean(searchTerm || category);

  return (
    <div className="page">
      <div className="hero animate-up mb-8">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
            EventHub
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Find something worth going to
          </h1>
          <p className="mt-2 max-w-xl text-sm text-indigo-100">
            {loading
              ? 'Loading events'
              : `${events.length} event${events.length === 1 ? '' : 's'}${filtersApplied ? ' matching your filters' : ' on sale right now'}.`}
          </p>
        </div>
      </div>

      <div className="card animate-up p-5 mb-8" style={{ '--d': '80ms' }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="label" htmlFor="event-keyword">Search</label>
            <input
              id="event-keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Title or venue"
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="event-category">Category</label>
            <input
              id="event-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Any category"
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="event-sort">Sort by</label>
            <select
              id="event-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="input"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filtersApplied && (
          <button
            onClick={() => { setKeyword(''); setCategory(''); }}
            className="btn-secondary btn-sm mt-4"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="card p-6">
              <div className="skeleton mb-3 h-6 w-1/3" />
              <div className="skeleton mb-2 h-4 w-1/4" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <p className="mb-1 text-base font-semibold text-slate-700">
            {filtersApplied ? 'No events match your filters.' : 'No events available yet.'}
          </p>
          <p className="muted">
            {filtersApplied
              ? 'Try a different keyword, or clear the filters.'
              : 'Check back soon, organisers are still adding events.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {events.map((ev, index) => {
            const remaining = ev.capacity - ev.bookedSeats;
            const soldOut = remaining <= 0;
            const filled = ev.capacity > 0
              ? Math.round((ev.bookedSeats / ev.capacity) * 100)
              : 0;
            const userId = user.id || user._id;
            const reviews = ev.reviews || [];
            const hasReviewed = reviews.some((review) =>
              String(review.reviewerId?._id || review.reviewerId) === String(userId)
            );
            const canReview = user.role === 'customer' && eligibleEventIds.includes(ev._id);

            return (
              <article
                key={ev._id}
                className="card card-hover animate-up p-6"
                style={{ '--d': `${Math.min(index, 8) * 70 + 120}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <h2 className="text-xl">{ev.title}</h2>
                      {ev.category && (
                        <span className="badge-neutral capitalize">{ev.category}</span>
                      )}
                    </div>

                    <p className="muted">{ev.venue}</p>
                    <p className="muted">{formatDateTime(ev.startsAt)}</p>

                    <div
                      className="mt-2.5 flex items-center gap-2 text-sm"
                      aria-label={`Average rating for ${ev.title}`}
                    >
                      {ev.averageRating === null || ev.averageRating === undefined ? (
                        <span className="text-slate-400">No ratings yet</span>
                      ) : (
                        <>
                          <Stars rating={Math.round(ev.averageRating)} />
                          <span className="font-semibold text-slate-800">
                            {Number(ev.averageRating).toFixed(1)}
                          </span>
                          <span className="text-slate-400">
                            {reviews.length} review{reviews.length === 1 ? '' : 's'}
                          </span>
                        </>
                      )}
                    </div>

                    {ev.description && (
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="gradient-text text-3xl font-extrabold tracking-tight">
                      {Number(ev.price) === 0 ? 'Free' : `$${ev.price}`}
                    </p>
                    <span
                      className={`mt-2 ${soldOut ? 'badge-danger' : remaining <= 5 ? 'badge-warning' : 'badge-success'}`}
                    >
                      {soldOut
                        ? 'Sold out'
                        : `${remaining} seat${remaining === 1 ? '' : 's'} left`}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`bar-fill h-full rounded-full ${soldOut ? 'bg-red-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                      style={{ width: `${Math.min(100, filled)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {ev.bookedSeats} of {ev.capacity} seats booked
                  </p>
                </div>

                {user.role === 'customer' && !soldOut && (
                  <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5">
                    <div>
                      <label className="label" htmlFor={`qty-${ev._id}`}>Tickets</label>
                      <input
                        id={`qty-${ev._id}`}
                        type="number"
                        min="1"
                        max={Math.min(10, remaining)}
                        value={qty[ev._id] || 1}
                        onChange={(e) => setQty({ ...qty, [ev._id]: e.target.value })}
                        className="input w-24"
                      />
                    </div>
                    <button
                      onClick={() => book(ev._id)}
                      disabled={busy === ev._id}
                      className="btn-primary"
                    >
                      {busy === ev._id ? 'Booking' : 'Book now'}
                    </button>
                  </div>
                )}

                {msg.id === ev._id && (
                  <p className={`mt-4 ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {msg.text}
                  </p>
                )}

                {reviews.length > 0 && (
                  <section
                    className="mt-5 border-t border-slate-100 pt-5"
                    aria-label={`Reviews for ${ev.title}`}
                  >
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                      Customer reviews ({reviews.length})
                    </h3>
                    <div className="space-y-2">
                      {reviews.map((review, reviewIndex) => (
                        <div
                          key={review._id}
                          className="animate-fade rounded-xl bg-slate-50/80 px-3.5 py-2.5"
                          style={{ '--d': `${reviewIndex * 50}ms` }}
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <Stars rating={review.rating} />
                            <span className="font-semibold text-slate-800">
                              {review.reviewerId?.name || 'Customer'}
                            </span>
                            <time className="text-xs text-slate-400" dateTime={review.createdAt}>
                              {new Date(review.createdAt).toLocaleDateString('en-AU', { dateStyle: 'medium' })}
                            </time>
                          </div>
                          {review.comment && (
                            <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {canReview && (
                  hasReviewed ? (
                    <p className="mt-5 border-t border-slate-100 pt-5 text-sm font-medium text-emerald-700">
                      You have reviewed this event.
                    </p>
                  ) : (
                    <div className="animate-panel mt-5 border-t border-slate-100 pt-5">
                      <h3 className="mb-3 text-sm font-semibold text-slate-900">Leave a review</h3>
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="label" htmlFor={`rating-${ev._id}`}>Rating</label>
                          <select
                            id={`rating-${ev._id}`}
                            value={reviewRatings[ev._id] || 5}
                            onChange={(e) => setReviewRatings({ ...reviewRatings, [ev._id]: e.target.value })}
                            className="input w-36"
                          >
                            {[5, 4, 3, 2, 1].map((rating) => (
                              <option key={rating} value={rating}>
                                {rating} star{rating === 1 ? '' : 's'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-[14rem] flex-1">
                          <label className="label" htmlFor={`comment-${ev._id}`}>
                            Comment, optional
                          </label>
                          <textarea
                            id={`comment-${ev._id}`}
                            maxLength={500}
                            rows={2}
                            value={reviewComments[ev._id] || ''}
                            onChange={(e) => setReviewComments({ ...reviewComments, [ev._id]: e.target.value })}
                            className="input"
                          />
                        </div>
                        <button
                          onClick={() => submitReview(ev._id)}
                          disabled={reviewBusy === ev._id}
                          className="btn-primary"
                        >
                          {reviewBusy === ev._id ? 'Submitting' : 'Submit review'}
                        </button>
                      </div>
                      {reviewMsg.id === ev._id && (
                        <p className={`mt-3 ${reviewMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                          {reviewMsg.text}
                        </p>
                      )}
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BrowseEvents;