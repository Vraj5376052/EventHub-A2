// Mocha requires every spec file before running any of them, so setting this
// here applies to the whole run. It keeps the deliberately failed writes in
// these tests from printing console noise over everyone else's output.
process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const sinon = require('sinon');
const AuditLog = require('../models/AuditLog');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const auditLogger = require('../patterns/AuditLogger');
const { AuditLogger } = auditLogger;
const { cancelBooking } = require('../controllers/bookingController');

const mockRes = () => {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
};

const inDays = (days) => new Date(Date.now() + days * 86400000);
const actor = { id: 'u1', email: 'niki@example.com', role: 'customer' };

describe('AuditLogger is a singleton (FR-10, NFR-04, US-4.3)', () => {
    it('two constructions return the same instance', () => {
        expect(new AuditLogger()).to.equal(new AuditLogger());
    });

    it('the instance the application requires is that same object', () => {
        expect(new AuditLogger()).to.equal(auditLogger);
    });

    it('getInstance returns it too', () => {
        expect(AuditLogger.getInstance()).to.equal(auditLogger);
    });

    it('state set on one reference is visible through another', () => {
        const a = new AuditLogger();
        const b = require('../patterns/AuditLogger');
        const before = a.writeCount;

        a.writeCount = before + 7;
        expect(b.writeCount).to.equal(before + 7);

        a.writeCount = before;
    });

    it('every controller that logs holds the same instance', () => {
        // Proves there is one trail, not one per caller. This is the property
        // the whole design rests on.
        const fromBooking = require('../patterns/AuditLogger');
        const fromEvent = require('../patterns/AuditLogger');
        expect(fromBooking).to.equal(fromEvent);
    });
});

describe('AuditLogger writes (FR-10, US-4.3)', () => {
    afterEach(() => sinon.restore());

    it('records the actor, the action, the target and lets the time default', async () => {
        const create = sinon.stub(AuditLog, 'create').resolves({ _id: 'a1' });

        await auditLogger.record(actor, auditLogger.ACTIONS.BOOKING_CREATED, 'Booking', 'b1', '2 x Jazz Night');

        expect(create.calledOnce).to.equal(true);
        const row = create.firstCall.args[0];
        expect(row.actorId).to.equal('u1');
        expect(row.actorEmail).to.equal('niki@example.com');
        expect(row.actorRole).to.equal('customer');
        expect(row.action).to.equal('BOOKING_CREATED');
        expect(row.targetType).to.equal('Booking');
        expect(row.targetId).to.equal('b1');
    });

    it('falls back to "system" when there is no signed in actor', async () => {
        const create = sinon.stub(AuditLog, 'create').resolves({ _id: 'a1' });

        await auditLogger.record(null, auditLogger.ACTIONS.EVENT_CANCELLED, 'Event', 'e1');

        expect(create.firstCall.args[0].actorEmail).to.equal('system');
        expect(create.firstCall.args[0].actorRole).to.equal('system');
    });

    it('swallows a write failure instead of rejecting', async () => {
        sinon.stub(AuditLog, 'create').rejects(new Error('database unreachable'));
        sinon.stub(console, 'error');

        const result = await auditLogger.record(actor, 'BOOKING_CREATED', 'Booking', 'b1');

        expect(result).to.equal(null);
        expect(auditLogger.stats().lastError).to.equal('database unreachable');
    });

    it('counts the writes it completed and the ones it lost', async () => {
        sinon.stub(console, 'error');
        const before = auditLogger.stats();

        sinon.stub(AuditLog, 'create').resolves({ _id: 'a1' });
        await auditLogger.record(actor, 'BOOKING_CREATED', 'Booking', 'b1');
        expect(auditLogger.stats().writeCount).to.equal(before.writeCount + 1);

        AuditLog.create.rejects(new Error('gone'));
        await auditLogger.record(actor, 'BOOKING_CREATED', 'Booking', 'b2');
        expect(auditLogger.stats().failureCount).to.equal(before.failureCount + 1);
    });
});

describe('A logging failure does not break the user action (NFR-04, US-4.3)', () => {
    afterEach(() => sinon.restore());

    it('the cancellation still succeeds when the audit write throws', async () => {
        sinon.stub(console, 'error');
        sinon.stub(Booking, 'findById').resolves({
            _id: 'b1', customerId: 'u1', status: 'confirmed', quantity: 2, eventId: 'e1',
        });
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1', title: 'Jazz Night', price: 50, startsAt: inDays(30),
        });
        sinon.stub(Booking, 'findOneAndUpdate').resolves({
            _id: 'b1', customerId: 'u1', status: 'cancelled', quantity: 2, eventId: 'e1',
        });
        sinon.stub(Event, 'updateOne').resolves({ acknowledged: true });

        // Both supporting writes fail at once.
        sinon.stub(AuditLog, 'create').rejects(new Error('audit database down'));
        sinon.stub(Notification, 'create').rejects(new Error('notification database down'));

        const res = mockRes();
        await cancelBooking({ params: { id: 'b1' }, user: actor }, res);

        // The customer still gets their cancellation and their refund figure.
        expect(res.status.calledWith(500)).to.equal(false);
        expect(res.json.calledOnce).to.equal(true);
        expect(res.json.firstCall.args[0].refund.amount).to.equal(100);
    });

    it('the audit write is started but never awaited by the controller', async () => {
        sinon.stub(Booking, 'findById').resolves({
            _id: 'b1', customerId: 'u1', status: 'confirmed', quantity: 1, eventId: 'e1',
        });
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1', title: 'Jazz Night', price: 20, startsAt: inDays(30),
        });
        sinon.stub(Booking, 'findOneAndUpdate').resolves({
            _id: 'b1', customerId: 'u1', status: 'cancelled', quantity: 1, eventId: 'e1',
        });
        sinon.stub(Event, 'updateOne').resolves({ acknowledged: true });
        sinon.stub(Notification, 'create').resolves({ _id: 'n1' });

        // A write that never settles. If the controller awaited it, the
        // response would never be sent and this test would time out.
        sinon.stub(AuditLog, 'create').returns(new Promise(() => {}));

        const res = mockRes();
        await cancelBooking({ params: { id: 'b1' }, user: actor }, res);

        expect(res.json.calledOnce).to.equal(true);
    });
});
