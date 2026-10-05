const express = require('express');
const {
    createBooking,
    getMyBookings,
    cancelBooking,
} = require('../controllers/bookingController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', protect, requireRole('customer'), createBooking);
router.get('/mine', protect, requireRole('customer'), getMyBookings);
router.patch('/:id/cancel', protect, requireRole('customer'), cancelBooking);

module.exports = router;