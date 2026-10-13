const { expect } = require('chai');
const sinon = require('sinon');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Review = require('../models/Review');
const EventSearchFacade = require('../patterns/EventSearchFacade');
const { getPublishedEvents } = require('../controllers/eventController');
const { addReview } = require('../controllers/reviewController');

const mockRes = () => {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
};

describe('event reviews', () => {
    afterEach(() => sinon.restore());

    it('returns 400 for ratings outside the one-to-five range', async () => {
        const res = mockRes();
        await addReview({ body: { rating: 6 }, params: { id: 'e1' } }, res);
        expect(res.status.calledWith(400)).to.equal(true);
    });

    it('returns 400 for comments longer than 500 characters', async () => {
        const res = mockRes();
        await addReview({ body: { rating: 4, comment: 'x'.repeat(501) }, params: { id: 'e1' } }, res);
        expect(res.status.calledWith(400)).to.equal(true);
    });

    it('requires a confirmed booking for an event that has started', async () => {
        sinon.stub(Event, 'findById').resolves({ _id: 'e1', startsAt: new Date(Date.now() - 1000) });
        sinon.stub(Booking, 'findOne').resolves(null);
        const res = mockRes();

        await addReview({ body: { rating: 4 }, params: { id: 'e1' }, user: { id: 'u1' } }, res);

        expect(res.status.calledWith(403)).to.equal(true);
    });

    it('stores a rating and optional comment for a confirmed customer', async () => {
        sinon.stub(Event, 'findById').resolves({ _id: 'e1', startsAt: new Date(Date.now() - 1000) });
        sinon.stub(Booking, 'findOne').resolves({ _id: 'b1' });
        const review = { eventId: 'e1', reviewerId: 'u1', rating: 5, comment: 'Excellent', createdAt: new Date() };
        const create = sinon.stub(Review, 'create').resolves(review);
        const res = mockRes();

        await addReview({ body: { rating: 5, comment: ' Excellent ' }, params: { id: 'e1' }, user: { id: 'u1' } }, res);

        expect(create.firstCall.args[0]).to.deep.equal({ eventId: 'e1', reviewerId: 'u1', rating: 5, comment: 'Excellent' });
        expect(res.status.calledWith(201)).to.equal(true);
        expect(res.json.firstCall.args[0].review).to.equal(review);
    });

    it('returns 409 when the customer already reviewed the event', async () => {
        sinon.stub(Event, 'findById').resolves({ _id: 'e1', startsAt: new Date(Date.now() - 1000) });
        sinon.stub(Booking, 'findOne').resolves({ _id: 'b1' });
        sinon.stub(Review, 'create').rejects({ code: 11000, message: 'duplicate key' });
        const res = mockRes();

        await addReview({ body: { rating: 4 }, params: { id: 'e1' }, user: { id: 'u1' } }, res);

        expect(res.status.calledWith(409)).to.equal(true);
    });
});

describe('event review listing', () => {
    afterEach(() => sinon.restore());

    it('includes populated reviewer names and review dates on published events', async () => {
        // The facade returns plain aggregation results, not Mongoose documents,
        // so the controller spreads the object directly.
        const event = { _id: 'e1', title: 'Live music' };
        const reviewDate = new Date('2026-10-01T12:00:00Z');
        const review = {
            eventId: 'e1',
            reviewerId: { name: 'Ari Customer' },
            rating: 5,
            comment: 'Excellent',
            createdAt: reviewDate,
        };
        const search = sinon.stub(EventSearchFacade, 'searchEvents').resolves([event]);
        const reviewQuery = {
            populate: sinon.stub().returnsThis(),
            sort: sinon.stub().resolves([review]),
        };
        sinon.stub(Review, 'find').returns(reviewQuery);
        const res = mockRes();

        await getPublishedEvents({ query: { category: 'music' } }, res);

        const publishedEvent = res.json.firstCall.args[0][0];
        expect(search.calledWith({ category: 'music' })).to.equal(true);
        expect(publishedEvent.title).to.equal('Live music');
        expect(publishedEvent.reviews[0].reviewerId.name).to.equal('Ari Customer');
        expect(publishedEvent.reviews[0].createdAt).to.equal(reviewDate);
        expect(reviewQuery.populate.calledWith('reviewerId', 'name')).to.equal(true);
    });
});