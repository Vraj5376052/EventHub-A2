import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

// FR-09, US-4.2. The bell in the navbar, its unread count, and the panel that
// drops down from it.
//
// Opening the panel marks everything read, but the rows keep the styling they
// had when they were fetched. If the unread highlight vanished the instant the
// list appeared, the user would never get to see which ones were new.

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const authHeader = useCallback(
    () => ({ headers: { Authorization: `Bearer ${user.token}` } }),
    [user]
  );

  // Just the count while the panel is shut, so the badge is right without
  // holding the whole list in memory.
  const refreshCount = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/notifications/mine', authHeader());
      setUnreadCount(res.data.unreadCount);
    } catch {
      // A failed poll is not worth showing the user. The next one will fix it.
    }
  }, [authHeader]);

  useEffect(() => {
    if (!user) return undefined;
    refreshCount();
    const timer = setInterval(refreshCount, 30000);
    return () => clearInterval(timer);
  }, [user, refreshCount]);

  // Click anywhere else to dismiss.
  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const openPanel = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/notifications/mine', authHeader());
      setNotifications(res.data.notifications);

      if (res.data.unreadCount > 0) {
        await axiosInstance.patch('/api/notifications/read-all', {}, authHeader());
        setUnreadCount(0);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative mr-4" ref={panelRef}>
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="relative px-2 py-1 hover:bg-blue-700 rounded"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <span className="text-xl" aria-hidden="true">&#128276;</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded shadow-lg border z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-2 border-b font-semibold text-sm">Notifications</div>

          {loading && <p className="px-4 py-6 text-sm text-gray-500">Loading…</p>}

          {/* An empty list is a normal state, so it reads as a message and not
              as something having gone wrong. */}
          {!loading && notifications.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500">No notifications yet.</p>
          )}

          {!loading && notifications.map((item) => (
            <div
              key={item._id}
              className={`px-4 py-3 border-b last:border-b-0 text-sm ${
                item.read ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-600'
              }`}
            >
              <p className={item.read ? 'text-gray-700' : 'text-gray-900 font-medium'}>
                {item.message}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
