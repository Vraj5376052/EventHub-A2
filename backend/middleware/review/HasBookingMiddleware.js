const Booking = require('../../models/Booking');
const ReviewMiddleware = require('./ReviewMiddleware');

class HasBookingMiddleware extends ReviewMiddleware {
    async process(req, res, next) {
        const booking = await Booking.findOne({
            eventId: req.reviewEvent._id,
            customerId: req.user.id,
            status: 'confirmed',
        });

        if (!booking) {
            res.status(403).json({ message: 'A confirmed booking is required to review this event' });
            return false;
        }

        return next();
    }
}

module.exports = HasBookingMiddleware;
