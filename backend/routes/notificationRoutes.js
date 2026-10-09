const express = require('express');
const {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Any signed in user, customer or organiser, reads their own notifications.
// There is no role check because the ownership filter in the controller is
// what matters here, not the kind of account.
router.get('/mine', protect, getMyNotifications);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, markAsRead);

module.exports = router;
