class ReviewMiddlewareManager {
    #middlewares;

    constructor(middlewares = []) {
        this.#middlewares = [...middlewares];
    }

    add(middleware, index = this.#middlewares.length) {
        if (index < 0 || index > this.#middlewares.length) {
            throw new RangeError('Middleware index is out of range.');
        }

        this.#middlewares.splice(index, 0, middleware);
        return this;
    }

    remove(middleware) {
        const index = this.#middlewares.indexOf(middleware);
        if (index !== -1) {
            this.#middlewares.splice(index, 1);
        }
        return this;
    }

    async process(req, res) {
        const dispatch = async (index) => {
            if (index >= this.#middlewares.length) {
                return true;
            }

            let nextCalled = false;
            const next = async () => {
                if (nextCalled) {
                    throw new Error('Review middleware called next() more than once.');
                }
                nextCalled = true;
                return dispatch(index + 1);
            };

            return this.#middlewares[index].process(req, res, next);
        };

        return dispatch(0);
    }
}

module.exports = ReviewMiddlewareManager;
