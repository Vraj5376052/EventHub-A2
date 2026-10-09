const Notification = require('../models/Notification');

/**
 * FR-09, US-4.2. A user reads their own notifications and marks them read.
 *
 * Every query below is filtered by req.user.id, which comes from the verified
 * token and never from the request body or the URL. A caller cannot ask for
 * somebody else's notifications by changing an id, because the id they pass is
 * only ever used together with their own.
 */

const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        // An empty list is a normal state for a new account, not an error.
        // The page shows "No notifications yet" off the back of this.
        res.json({
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        // userId is part of the filter, not checked afterwards, so a request
        // for another user's notification matches nothing and gets a 404
        // rather than quietly succeeding.
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { $set: { read: true } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        // What the UI calls when the panel is opened.
        const result = await Notification.updateMany(
            { userId: req.user.id, read: false },
            { $set: { read: true } }
        );

        res.json({ updated: result.modifiedCount || 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
