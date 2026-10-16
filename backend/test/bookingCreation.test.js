process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const sinon = require('sinon');
const Event = require('../models/Event');
const { createBooking } = require('../controllers/bookingController');

describe('createBooking rejections (FR-01, FR-11)', () => {
    afterEach(() => sinon.restore());

    const mockResponse = () => ({
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis(),
    });

    const request = (body) => ({ body, user: { id: 'c1' } });

    it('returns 400 when the event has already ended', async () => {
        sinon.stub(Event, 'findOneAndUpdate').resolves(null);
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1',
            status: 'published',
            startsAt: new Date(Date.now() - 86400000),
            capacity: 10,
            bookedSeats: 2,
        });
        const res = mockResponse();

        await createBooking(request({ eventId: 'e1', quantity: 1 }), res);

        expect(res.status.calledOnceWithExactly(400)).to.equal(true);
        expect(res.json.firstCall.args[0].message).to.match(/ended/);
    });

    it('still reports sold out for an upcoming event', async () => {
        sinon.stub(Event, 'findOneAndUpdate').resolves(null);
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1',
            status: 'published',
            startsAt: new Date(Date.now() + 86400000),
            capacity: 10,
            bookedSeats: 10,
        });
        const res = mockResponse();

        await createBooking(request({ eventId: 'e1', quantity: 1 }), res);

        expect(res.status.calledOnceWithExactly(400)).to.equal(true);
        expect(res.json.firstCall.args[0].message).to.match(/sold out/);
    });

    it('rejects a quantity outside 1 to 10', async () => {
        const res = mockResponse();

        await createBooking(request({ eventId: 'e1', quantity: 0 }), res);

        expect(res.status.calledOnceWithExactly(400)).to.equal(true);
        expect(res.json.firstCall.args[0]).to.have.property('field', 'quantity');
    });
});
