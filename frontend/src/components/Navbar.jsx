import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <Link to={user ? (user.role === 'organiser' ? '/my-events' : '/events') : '/login'} className="text-2xl font-bold">EventHub</Link>
      <div className="flex items-center">
        {user ? (
          <>
            {user.role === 'organiser' && (
              <>
                <Link to="/my-events" className="mr-4">My Events</Link>
                <Link to="/create-event" className="mr-4">Create Event</Link>
              </>
            )}
            {user.role === 'customer' && (
              <>
                <Link to="/events" className="mr-4">Browse Events</Link>
                <Link to="/my-bookings" className="mr-4">My Bookings</Link>
              </>
            )}
            <Link to="/profile" className="mr-4">Profile</Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="mr-4">Login</Link>
            <Link
              to="/register"
              className="bg-green-500 px-4 py-2 rounded hover:bg-green-700"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;