import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const Profile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setFormData({ name: response.data.name, email: response.data.email });
    } catch {
      setMsg({ type: 'error', text: 'Could not load your profile. Please refresh.' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) fetchProfile(); }, [user, fetchProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setSaving(true);
    try {
      await axiosInstance.put('/api/auth/profile', formData, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setMsg({ type: 'success', text: 'Your profile has been updated.' });
    } catch (err) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || 'Could not update your profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="page-narrow">
        <div className="empty-state">
          <p className="font-medium text-slate-700">Please log in to see your profile.</p>
        </div>
      </div>
    );
  }

  const initial = (formData.name || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="page-narrow">
      <div className="animate-up mb-6 flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white"
          style={{ backgroundImage: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="truncate">{formData.name || 'Your profile'}</h1>
          <p className="muted mt-1 capitalize">{user.role}</p>
        </div>
      </div>

      {loading ? (
        <div className="card-pad space-y-4">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-11 w-full" />
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-11 w-full" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="card-pad animate-up space-y-4"
          style={{ '--d': '90ms' }}
        >
          <div>
            <label className="label" htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
            />
          </div>

          {msg.text && (
            <p className={msg.type === 'success' ? 'alert-success' : 'alert-error'}>
              {msg.text}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving' : 'Save changes'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Profile;