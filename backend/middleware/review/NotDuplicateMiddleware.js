const Review = require('../../models/Review');
const ReviewMiddleware = require('./ReviewMiddleware');

class NotDuplicateMiddleware extends ReviewMiddleware {
    async process(req, res, next) {
        const review = await Review.findOne({
            eventId: req.reviewEvent._id,
            customerId: req.user.id,
        });

        if (review) {
            res.status(409).json({ message: 'You have already reviewed this event' });
            return false;
        }

        return next();
    }
}

module.exports = NotDuplicateMiddleware;
