const ReviewMiddleware = require('./ReviewMiddleware');

class AuthenticatedMiddleware extends ReviewMiddleware {
    async process(req, res, next) {
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Not authorized, no token' });
            return false;
        }

        return next();
    }
}

module.exports = AuthenticatedMiddleware;
