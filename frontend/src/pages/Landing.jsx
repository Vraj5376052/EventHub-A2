import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { user } = useAuth();

  if (user) {
    const home = user.role === 'organiser' ? '/my-events' : user.role === 'admin' ? '/audit' : '/events';
    return <Navigate to={home} replace />;
  }

  return (
    <div className="page">
      <section className="hero">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">EventHub</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Find something worth going to</h1>
          <p className="mt-4 text-indigo-100">
            Browse local events, book your seats in seconds and rate them afterwards.
            Organisers publish an event once and watch the bookings come in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary">Get started</Link>
            <Link to="/login" className="btn-secondary">Log in</Link>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <div className="card-pad">
          <h2>Book in seconds</h2>
          <p className="muted mt-2">Live seat counts, instant confirmation and a reference you can keep.</p>
        </div>
        <div className="card-pad">
          <h2>Fair refunds</h2>
          <p className="muted mt-2">Cancel early for a full refund, the cut-offs are clear before you book.</p>
        </div>
        <div className="card-pad">
          <h2>Reviews you can trust</h2>
          <p className="muted mt-2">Only customers who attended an event can rate it.</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
