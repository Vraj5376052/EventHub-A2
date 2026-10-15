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
    error.field === f ? <p className="text-sm text-red-600 mt-1">{error.message}</p> : null;
  const inputClass = (f) =>
    `input ${error.field === f ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`;

  if (!user) {
    return (
      <div className="page-narrow">
        <div className="empty-state">
          <p className="font-medium text-slate-700">Please log in to create an event.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1>Create event</h1>
        <p className="muted mt-1">Published immediately, customers can book straight away.</p>
      </div>

      <form onSubmit={handleSubmit} className="card-pad space-y-4">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={set('title')}
            className={inputClass('title')}
            placeholder="Indie Night at The Zoo"
          />
          {errorFor('title')}
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={set('description')}
            rows="3"
            className="input"
            placeholder="Optional"
          />
        </div>

<div>
  <label className="label" htmlFor="category">
    Category
  </label>

  <select
    id="category"
    value={formData.category}
    onChange={set('category')}
    className="input"
    required
  >
    <option value="">Select a category</option>
    <option value="music">Music</option>
    <option value="sports">Sports</option>
    <option value="workshop">Workshop</option>
    <option value="other">Other</option>
  </select>

  <p className="muted mt-1">
    Please select a category for your event.
  </p>
</div>


        <div>
          <label className="label" htmlFor="venue">Venue</label>
          <input
            id="venue"
            type="text"
            value={formData.venue}
            onChange={set('venue')}
            className={inputClass('venue')}
            placeholder="The Zoo, Fortitude Valley"
          />
          {errorFor('venue')}
        </div>

        <div>
          <label className="label" htmlFor="startsAt">Date and time</label>
          <input
            id="startsAt"
            type="datetime-local"
            value={formData.startsAt}
            onChange={set('startsAt')}
            className={inputClass('startsAt')}
          />
          {errorFor('startsAt')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="capacity">Seat limit</label>
            <input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={set('capacity')}
              className={inputClass('capacity')}
              placeholder="60"
            />
            {errorFor('capacity')}
          </div>

          <div>
            <label className="label" htmlFor="price">Price, AUD</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={set('price')}
              className={inputClass('price')}
              placeholder="25"
            />
            {errorFor('price')}
          </div>
        </div>

        {!error.field && error.message && (
          <p className="alert-error">{error.message}</p>
        )}

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving' : 'Create event'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/my-events')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;