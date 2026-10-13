import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const navLinkClass = ({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link');

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const home = user
    ? (user.role === 'organiser' ? '/my-events' : user.role === 'admin' ? '/audit' : '/events')
    : '/login';

  return (
    <nav className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          to={home}
          className="shrink-0 text-xl font-bold tracking-tight transition-transform hover:scale-[1.03]"
        >
          <span className="text-slate-900">Event</span>
          <span className="gradient-text">Hub</span>
        </Link>

        <div className="flex items-center gap-0.5">
          {user ? (
            <>
              {user.role === 'organiser' && (
                <>
                  <NavLink to="/my-events" className={navLinkClass}>My events</NavLink>
                  <NavLink to="/create-event" className={navLinkClass}>Create event</NavLink>
                </>
              )}
              {user.role === 'customer' && (
                <>
                  <NavLink to="/events" className={navLinkClass}>Browse events</NavLink>
                  <NavLink to="/my-bookings" className={navLinkClass}>My bookings</NavLink>
                </>
              )}
              {user.role === 'admin' && (
                <NavLink to="/audit" className={navLinkClass}>Audit trail</NavLink>
              )}

              <NotificationBell />

              <NavLink to="/profile" className={navLinkClass}>Profile</NavLink>
              <button onClick={handleLogout} className="btn-secondary btn-sm ml-2">
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>Log in</NavLink>
              <Link to="/register" className="btn-primary btn-sm ml-2">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;