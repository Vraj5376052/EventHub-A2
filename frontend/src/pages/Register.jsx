import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: '' });
  const [error, setError] = useState({ field: '', message: '' });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError({ field: '', message: '' });
    setBusy(true);
    try {
      await axiosInstance.post('/api/auth/register', formData);
      navigate('/login');
    } catch (err) {
      const data = err.response?.data;
      setError({
        field: data?.field || '',
        message: data?.message || 'Registration failed. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });
  const errorFor = (field) =>
    error.field === field ? <p className="mt-1 text-sm text-red-600">{error.message}</p> : null;
  const inputClass = (field) => `input ${error.field === field ? 'input-error' : ''}`;

  return (
    <div className="page-narrow">
      <div className="animate-up mb-6 text-center">
        <h1>
          Join <span className="gradient-text">EventHub</span>
        </h1>
        <p className="muted mt-2">Takes a minute. Pick the role that fits you.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card-pad animate-up space-y-4"
        style={{ '--d': '90ms' }}
      >
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={formData.name}
            onChange={set('name')}
            className={inputClass('name')}
          />
          {errorFor('name')}
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={set('email')}
            className={inputClass('email')}
          />
          {errorFor('email')}
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={set('password')}
            className={inputClass('password')}
          />
          {errorFor('password')}
        </div>

        <div>
          <label className="label" htmlFor="role">I am a</label>
          <select
            id="role"
            value={formData.role}
            onChange={set('role')}
            className={inputClass('role')}
          >
            <option value="">Select your role</option>
            <option value="customer">Customer, I want to book tickets</option>
            <option value="organiser">Organiser, I want to run events</option>
          </select>
          {errorFor('role')}
        </div>

        {!error.field && error.message && <p className="alert-error">{error.message}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Creating your account' : 'Create account'}
        </button>

        <p className="muted text-center">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;