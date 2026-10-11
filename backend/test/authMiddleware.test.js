// Mocha requires every spec file before running any of them, so setting this
// here applies to the whole run.
process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const sinon = require('sinon');
const { protect } = require('../middleware/authMiddleware');

// Counts how many times a response is actually sent. The bug this guards
// against was not a wrong status code, it was two responses on one request,
// which makes Express throw ERR_HTTP_HEADERS_SENT and stops the process.
const mockRes = () => {
    const res = { sent: 0 };
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().callsFake(() => { res.sent += 1; return res; });
    return res;
};

describe('protect sends exactly one response (NFR-04)', () => {
    afterEach(() => sinon.restore());

    it('refuses a request with no Authorization header, once', async () => {
        const res = mockRes();
        const next = sinon.stub();

        await protect({ headers: {} }, res, next);

        expect(res.sent).to.equal(1);
        expect(res.status.calledWith(401)).to.equal(true);
        expect(next.called).to.equal(false);
    });

    it('refuses an empty bearer token, once', async () => {
        // 'Bearer ' passes the startsWith check but splits to an empty string,
        // so it reaches the verify failure and the falsy-token guard both. Before
        // the returns were added this sent two responses and killed the server.
        const res = mockRes();
        const next = sinon.stub();

        await protect({ headers: { authorization: 'Bearer ' } }, res, next);

        expect(res.sent).to.equal(1);
        expect(res.status.calledWith(401)).to.equal(true);
        expect(next.called).to.equal(false);
    });

    it('refuses a malformed token, once', async () => {
        const res = mockRes();
        const next = sinon.stub();

        await protect({ headers: { authorization: 'Bearer not-a-real-jwt' } }, res, next);

        expect(res.sent).to.equal(1);
        expect(res.status.calledWith(401)).to.equal(true);
        expect(next.called).to.equal(false);
    });
});
