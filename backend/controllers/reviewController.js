const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Review = require('../models/Review');

const addReview = async (req, res) => {
    const body = req.body || {};
    const rating = Number(body.rating);
    const comment = body.comment === undefined ? '' : body.comment;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ field: 'rating', message: 'Rating must be a whole number from 1 to 5' });
    }
    if (typeof comment !== 'string' || comment.length > 500) {
        return res.status(400).json({ field: 'comment', message: 'Comment must be 500 characters or fewer' });
    }

    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (new Date(event.startsAt) > new Date()) {
            return res.status(400).json({ message: 'Reviews are available after the event has started' });
        }

        const booking = await Booking.findOne({
            eventId: event._id,
            customerId: req.user.id,
            status: 'confirmed',
        });
        if (!booking) {
            return res.status(403).json({ message: 'A confirmed booking is required to review this event' });
        }

        const review = await Review.create({
            eventId: event._id,
            reviewerId: req.user.id,
            rating,
            comment: comment.trim(),
        });
        return res.status(201).json({ review });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'You have already reviewed this event' });
        }
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { addReview };