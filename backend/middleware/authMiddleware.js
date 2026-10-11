
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            // Return, or the guard below sends a second response on the same
            // request and Express throws ERR_HTTP_HEADERS_SENT, which brings
            // the whole process down. A request carrying an empty bearer hits
            // both branches: jwt.verify throws because the token is '', and ''
            // is also falsy, so without this return one malformed header is
            // enough to stop the server for everybody.
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
        return;
    }

    return res.status(401).json({ message: 'Not authorized, no token' });
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};

module.exports = { protect, requireRole };
