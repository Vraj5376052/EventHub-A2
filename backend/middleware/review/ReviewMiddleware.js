class ReviewMiddleware {
    async process(req, res, next) {
        throw new Error(`${this.constructor.name} must implement process().`);
    }
}

module.exports = ReviewMiddleware;
