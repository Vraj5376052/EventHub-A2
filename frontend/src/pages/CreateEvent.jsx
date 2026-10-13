import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
 const [formData, setFormData] = useState({
  title: '',
  description: '',
  category: '',
  venue: '',
  startsAt: '',
  capacity: '',
  price: '',
});
  const [error, setError] = useState({ field: '', message: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError({ field: '', message: '' });
    setSaving(true);
    try {
      await axiosInstance.post('/api/events', formData, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      navigate('/my-events');
    } catch (err) {
      const data = err.response?.data;
      setError({
        field: data?.field || '',
        message: data?.message || 'Could not create the event. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const set = (f) => (e) => setFormData({ ...formData, [f]: e.target.value });
  const errorFor = (f) =>
    error.field === f ? <p className="text-red-600 text-sm mb-2">{error.message}</p> : null;

  if (!user) return <p className="text-center mt-20">Please log in.</p>;

  return (
    <div className="max-w-lg mx-auto mt-10 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded">
        <h1 className="text-2xl font-bold mb-4">Create Event</h1>

        <label className="block text-sm font-medium mb-1">Title</label>
        <input type="text" value={formData.title} onChange={set('title')}
          className="w-full mb-1 p-2 border rounded" placeholder="Indie Night at The Zoo" />
        {errorFor('title')}

        <label className="block text-sm font-medium mb-1 mt-3">Description</label>
        <textarea value={formData.description} onChange={set('description')} rows="3"
          className="w-full mb-1 p-2 border rounded" placeholder="Optional" />

        <label className="block text-sm font-medium mb-1 mt-3">Category</label>
        <input type="text" value={formData.category} onChange={set('category')} 
          className="w-full mb-1 p-2 border rounded" placeholder="e.g. Music, Sports, Workshop"/>

        <label className="block text-sm font-medium mb-1 mt-3">Venue</label>
        <input type="text" value={formData.venue} onChange={set('venue')}
          className="w-full mb-1 p-2 border rounded" placeholder="The Zoo, Fortitude Valley" />
        {errorFor('venue')}

        <label className="block text-sm font-medium mb-1 mt-3">Date and time</label>
        <input type="datetime-local" value={formData.startsAt} onChange={set('startsAt')}
          className="w-full mb-1 p-2 border rounded" />
        {errorFor('startsAt')}

        <label className="block text-sm font-medium mb-1 mt-3">Seat limit</label>
        <input type="number" min="1" value={formData.capacity} onChange={set('capacity')}
          className="w-full mb-1 p-2 border rounded" placeholder="60" />
        {errorFor('capacity')}

        <label className="block text-sm font-medium mb-1 mt-3">Price (AUD)</label>
        <input type="number" min="0" step="0.01" value={formData.price} onChange={set('price')}
          className="w-full mb-1 p-2 border rounded" placeholder="25" />
        {errorFor('price')}

        {!error.field && error.message && (
          <p className="text-red-600 text-sm mt-3">{error.message}</p>
        )}

        <button type="submit" disabled={saving}
          className="w-full bg-green-600 text-white p-2 rounded mt-5 disabled:bg-gray-400">
          {saving ? 'Saving…' : 'Create Event'}
        </button>
      </form>
    </div>
  );
};

export default CreateEvent;
