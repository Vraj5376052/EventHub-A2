const { expect } = require('chai');
const sinon = require('sinon');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { cancelBooking } = require('../controllers/bookingController');

const mockRes = () => {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
};

const inDays = (days) => new Date(Date.now() + days * 86400000);

describe('cancelBooking rejections (FR-02, US-1.4)', () => {
    afterEach(() => sinon.restore());

    it('returns 404 when the booking does not exist', async () => {
        sinon.stub(Booking, 'findById').resolves(null);
        const res = mockRes();
        await cancelBooking({ params: { id: 'nope' }, user: { id: 'u1' } }, res);
        expect(res.status.calledWith(404)).to.equal(true);
    });

    it('returns 403 when the booking belongs to another customer', async () => {
        sinon.stub(Booking, 'findById').resolves({
            _id: 'b1', customerId: 'u2', status: 'confirmed', quantity: 2,
        });
        const res = mockRes();
        await cancelBooking({ params: { id: 'b1' }, user: { id: 'u1' } }, res);
        expect(res.status.calledWith(403)).to.equal(true);
    });

    it('returns 400 when the booking is already cancelled', async () => {
        sinon.stub(Booking, 'findById').resolves({
            _id: 'b1', customerId: 'u1', status: 'cancelled', quantity: 2,
        });
        const res = mockRes();
        await cancelBooking({ params: { id: 'b1' }, user: { id: 'u1' } }, res);
        expect(res.status.calledWith(400)).to.equal(true);
    });

    it('returns 404 when the event no longer exists', async () => {
        sinon.stub(Booking, 'findById').resolves({
            _id: 'b1', customerId: 'u1', status: 'confirmed', quantity: 2, eventId: 'e1',
        });
        sinon.stub(Event, 'findById').resolves(null);
        const res = mockRes();
        await cancelBooking({ params: { id: 'b1' }, user: { id: 'u1' } }, res);
        expect(res.status.calledWith(404)).to.equal(true);
    });

    it('returns 400 when the event has already started', async () => {
        sinon.stub(Booking, 'findById').resolves({
            _id: 'b1', customerId: 'u1', status: 'confirmed', quantity: 2, eventId: 'e1',
        });
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1', price: 50, startsAt: inDays(-1),
        });
        const res = mockRes();
        await cancelBooking({ params: { id: 'b1' }, user: { id: 'u1' } }, res);
        expect(res.status.calledWith(400)).to.equal(true);
    });

    it('returns 400 when another request cancelled it first', async () => {
        sinon.stub(Booking, 'findById').resolves({
            _id: 'b1', customerId: 'u1', status: 'confirmed', quantity: 2, eventId: 'e1',
        });
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1', price: 50, startsAt: inDays(30),
        });
        // The guarded flip finds nothing, because the status is no longer 'confirmed'
        sinon.stub(Booking, 'findOneAndUpdate').resolves(null);
        const res = mockRes();
        await cancelBooking({ params: { id: 'b1' }, user: { id: 'u1' } }, res);
        expect(res.status.calledWith(400)).to.equal(true);
    });
});

describe('cancelBooking success path (FR-02, FR-03)', () => {
    afterEach(() => sinon.restore());

    it('applies the full refund policy and releases the seats', async () => {
        sinon.stub(Booking, 'findById').resolves({
            _id: 'b1', customerId: 'u1', status: 'confirmed', quantity: 2, eventId: 'e1',
        });
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1', price: 50, startsAt: inDays(30),
        });
        sinon.stub(Booking, 'findOneAndUpdate').resolves({
            _id: 'b1', status: 'cancelled', refundAmount: 100,
        });
        const seatRelease = sinon.stub(Event, 'updateOne').resolves({});

        const res = mockRes();
        await cancelBooking({ params: { id: 'b1' }, user: { id: 'u1' } }, res);

        const payload = res.json.firstCall.args[0];
        expect(payload.refund.amount).to.equal(100);
        expect(payload.refund.policy).to.equal('Full refund');
        expect(seatRelease.calledOnce).to.equal(true);
        expect(seatRelease.firstCall.args[1]).to.deep.equal({ $inc: { bookedSeats: -2 } });
    });
});