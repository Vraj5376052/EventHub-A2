const ReviewMiddleware = require('./ReviewMiddleware');

class OrganiserReviewMiddleware extends ReviewMiddleware {
    async process(req, res, next) {
        if (String(req.reviewEvent.organiserId) === String(req.user.id)) {
            res.status(403).json({ message: 'Organisers cannot review their own events' });
            return false;
        }

        return next();
    }
}

module.exports = OrganiserReviewMiddleware;
