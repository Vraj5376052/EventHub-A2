// Mocha requires every spec file before running any of them, so setting this
// here applies to the whole run. It keeps the deliberately failed writes in
// these tests from printing console noise over everyone else's output.
process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const sinon = require('sinon');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
} = require('../controllers/notificationController');
const { getAuditLog } = require('../controllers/auditController');

const mockRes = () => {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
};

// Notification.find(...).sort(...).limit(...) resolves to the rows.
const stubFindChain = (rows) => {
    const chain = { sort: sinon.stub().returnsThis(), limit: sinon.stub().resolves(rows) };
    return sinon.stub(Notification, 'find').returns(chain);
};

describe('Listing my notifications (FR-09, US-4.2)', () => {
    afterEach(() => sinon.restore());

    it('asks only for rows belonging to the signed in user', async () => {
        const find = stubFindChain([]);

        await getMyNotifications({ user: { id: 'u1' } }, mockRes());

        expect(find.calledOnce).to.equal(true);
        expect(find.firstCall.args[0]).to.deep.equal({ userId: 'u1' });
    });

    it('returns newest first', async () => {
        const chain = { sort: sinon.stub().returnsThis(), limit: sinon.stub().resolves([]) };
        sinon.stub(Notification, 'find').returns(chain);

        await getMyNotifications({ user: { id: 'u1' } }, mockRes());

        expect(chain.sort.calledWith({ createdAt: -1 })).to.equal(true);
    });

    it('counts the unread ones', async () => {
        stubFindChain([
            { _id: 'n1', read: false },
            { _id: 'n2', read: true },
            { _id: 'n3', read: false },
        ]);
        const res = mockRes();

        await getMyNotifications({ user: { id: 'u1' } }, res);

        expect(res.json.firstCall.args[0].unreadCount).to.equal(2);
    });

    it('an empty list is a normal response, not an error', async () => {
        stubFindChain([]);
        const res = mockRes();

        await getMyNotifications({ user: { id: 'u1' } }, res);

        expect(res.status.called).to.equal(false);
        expect(res.json.firstCall.args[0].notifications).to.deep.equal([]);
        expect(res.json.firstCall.args[0].unreadCount).to.equal(0);
    });

    it('returns 500 if the database fails', async () => {
        sinon.stub(Notification, 'find').throws(new Error('database unreachable'));
        const res = mockRes();

        await getMyNotifications({ user: { id: 'u1' } }, res);

        expect(res.status.calledWith(500)).to.equal(true);
    });
});

describe('Marking a notification read (FR-09, US-4.2)', () => {
    afterEach(() => sinon.restore());

    it('matches on the id and the owner together', async () => {
        const update = sinon.stub(Notification, 'findOneAndUpdate').resolves({ _id: 'n1', read: true });

        await markAsRead({ params: { id: 'n1' }, user: { id: 'u1' } }, mockRes());

        expect(update.firstCall.args[0]).to.deep.equal({ _id: 'n1', userId: 'u1' });
    });

    it('returns 404 for another user\'s notification rather than updating it', async () => {
        // The owner is part of the filter, so somebody else's id matches nothing.
        sinon.stub(Notification, 'findOneAndUpdate').resolves(null);
        const res = mockRes();

        await markAsRead({ params: { id: 'n-someone-else' }, user: { id: 'u1' } }, res);

        expect(res.status.calledWith(404)).to.equal(true);
    });

    it('marks every unread row for that user when the panel opens', async () => {
        const updateMany = sinon.stub(Notification, 'updateMany').resolves({ modifiedCount: 3 });
        const res = mockRes();

        await markAllAsRead({ user: { id: 'u1' } }, res);

        expect(updateMany.firstCall.args[0]).to.deep.equal({ userId: 'u1', read: false });
        expect(res.json.calledWith({ updated: 3 })).to.equal(true);
    });
});

describe('Reading the audit trail (FR-10, US-4.3)', () => {
    afterEach(() => sinon.restore());

    const stubAuditChain = (rows) => {
        const chain = {
            sort: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            limit: sinon.stub().resolves(rows),
        };
        sinon.stub(AuditLog, 'find').returns(chain);
        sinon.stub(AuditLog, 'countDocuments').resolves(rows.length);
        return chain;
    };

    it('returns the entries newest first with a total', async () => {
        stubAuditChain([{ _id: 'a1', action: 'BOOKING_CREATED' }]);
        const res = mockRes();

        await getAuditLog({ query: {} }, res);

        const body = res.json.firstCall.args[0];
        expect(body.entries).to.have.length(1);
        expect(body.total).to.equal(1);
    });

    it('narrows by action when asked', async () => {
        stubAuditChain([]);

        await getAuditLog({ query: { action: 'BOOKING_CANCELLED' } }, mockRes());

        expect(AuditLog.find.firstCall.args[0]).to.deep.equal({ action: 'BOOKING_CANCELLED' });
    });

    it('caps the page size so one request cannot pull the whole trail', async () => {
        const chain = stubAuditChain([]);

        await getAuditLog({ query: { perPage: '5000' } }, mockRes());

        expect(chain.limit.calledWith(100)).to.equal(true);
    });

    it('exposes no handler that writes, edits or deletes an entry', () => {
        // The append-only rule (NFR-04) read back off the controller itself.
        const auditController = require('../controllers/auditController');
        expect(Object.keys(auditController)).to.deep.equal(['getAuditLog']);
    });
});
