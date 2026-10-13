import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const formatDateTime = (value) => new Date(value).toLocaleString('en-AU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const MyEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get('/api/events/mine', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setEvents(res.data);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  if (!user) {
    return (
      <div className="page-narrow">
        <div className="empty-state">
          <p className="font-medium text-slate-700">Please log in to manage your events.</p>
        </div>
      </div>
    );
  }

  const totalBooked = events.reduce((sum, ev) => sum + ev.bookedSeats, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My events</h1>
          <p className="muted mt-1">
            {loading
              ? 'Loading your events'
              : `${events.length} event${events.length === 1 ? '' : 's'}, ${totalBooked} seat${totalBooked === 1 ? '' : 's'} booked`}
          </p>
        </div>
        <Link to="/create-event" className="btn-primary">Create event</Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((row) => (
            <div key={row} className="card p-5">
              <div className="skeleton h-5 w-1/3 mb-3" />
              <div className="skeleton h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <p className="font-medium text-slate-700 mb-1">No events yet.</p>
          <p className="muted mb-4">Create your first event to start taking bookings.</p>
          <Link to="/create-event" className="btn-primary">Create event</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => {
            const remaining = ev.capacity - ev.bookedSeats;
            const soldOut = remaining <= 0;
            const filled = ev.capacity > 0
              ? Math.round((ev.bookedSeats / ev.capacity) * 100)
              : 0;

            return (
              <article key={ev._id} className="card card-hover p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2>{ev.title}</h2>
                      {ev.category && (
                        <span className="badge-neutral capitalize">{ev.category}</span>
                      )}
                    </div>
                    <p className="muted">{ev.venue}</p>
                    <p className="muted">{formatDateTime(ev.startsAt)}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-slate-900">
                      {Number(ev.price) === 0 ? 'Free' : `$${ev.price}`}
                    </p>
                    <span className={`mt-2 ${soldOut ? 'badge-danger' : remaining <= 5 ? 'badge-warning' : 'badge-success'}`}>
                      {soldOut ? 'Sold out' : `${remaining} left`}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700">
                      {ev.bookedSeats} of {ev.capacity} seats booked
                    </span>
                    <span className="text-slate-500">{filled}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${soldOut ? 'bg-red-500' : 'bg-indigo-600'}`}
                      style={{ width: `${Math.min(100, filled)}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyEvents;