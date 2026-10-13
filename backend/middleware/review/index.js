const AuthenticatedMiddleware = require('./AuthenticatedMiddleware');
const HasBookingMiddleware = require('./HasBookingMiddleware');
const NotDuplicateMiddleware = require('./NotDuplicateMiddleware');
const OrganiserReviewMiddleware = require('./OrganiserReviewMiddleware');
const ReviewMiddlewareManager = require('./ReviewMiddlewareManager');

module.exports = new ReviewMiddlewareManager([
    new AuthenticatedMiddleware(),
    new OrganiserReviewMiddleware(),
    new HasBookingMiddleware(),
    new NotDuplicateMiddleware(),
]);
