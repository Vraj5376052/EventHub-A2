const express = require('express');
const { createEvent, getMyEvents, getPublishedEvents } = require('../controllers/eventController');
const { addReview } = require('../controllers/reviewController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getPublishedEvents);
router.post('/', protect, requireRole('organiser'), createEvent);
router.get('/mine', protect, requireRole('organiser'), getMyEvents);
router.post('/:id/reviews', protect, requireRole('customer'), addReview);

module.exports = router;