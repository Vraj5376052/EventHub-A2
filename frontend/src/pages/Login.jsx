import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const landingFor = (role) => {
    if (role === 'organiser') return '/my-events';
    if (role === 'admin') return '/audit';
    return '/events';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await axiosInstance.post('/api/auth/login', formData);
      login(response.data);
      navigate(landingFor(response.data.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Those details did not match an account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-narrow">
      <div className="animate-up mb-6 text-center">
        <h1>
          Welcome back to <span className="gradient-text">EventHub</span>
        </h1>
        <p className="muted mt-2">Log in to book tickets or manage your events.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card-pad animate-up space-y-4"
        style={{ '--d': '90ms' }}
      >
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`input ${error ? 'input-error' : ''}`}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={`input ${error ? 'input-error' : ''}`}
          />
        </div>

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Logging in' : 'Log in'}
        </button>

        <p className="muted text-center">
          No account yet?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;