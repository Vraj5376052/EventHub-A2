const { expect } = require('chai');
const sinon = require('sinon');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Review = require('../models/Review');
const { getPublishedEvents } = require('../controllers/eventController');
const { addReview } = require('../controllers/reviewController');
const ReviewMiddlewareManager = require('../middleware/review/ReviewMiddlewareManager');
const migrateReviewCustomerId = require('../scripts/migrateReviewCustomerId');

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

    it('returns 403 when the customer has no booking for the event', async () => {
        sinon.stub(Event, 'findById').resolves({ _id: 'e1', startsAt: new Date(Date.now() - 1000) });
        sinon.stub(Booking, 'findOne').resolves(null);
        const res = mockRes();

        await addReview({ body: { rating: 4 }, params: { id: 'e1' }, user: { id: 'u1' } }, res);

        expect(res.status.calledWith(403)).to.equal(true);
    });

    it('returns 403 when the customer booking was cancelled', async () => {
        sinon.stub(Event, 'findById').resolves({ _id: 'e1', startsAt: new Date(Date.now() - 1000) });
        const findBooking = sinon.stub(Booking, 'findOne').resolves(null);
        const res = mockRes();

        await addReview({ body: { rating: 4 }, params: { id: 'e1' }, user: { id: 'u1' } }, res);

        expect(res.status.calledWith(403)).to.equal(true);
        expect(findBooking.firstCall.args[0]).to.deep.equal({
            eventId: 'e1',
            customerId: 'u1',
            status: 'confirmed',
        });
    });

    it('returns 409 when the customer has already reviewed the event', async () => {
        sinon.stub(Event, 'findById').resolves({ _id: 'e1', startsAt: new Date(Date.now() - 1000) });
        sinon.stub(Booking, 'findOne').resolves({ _id: 'b1', status: 'confirmed' });
        sinon.stub(Review, 'findOne').resolves({ _id: 'r1' });
        const create = sinon.stub(Review, 'create');
        const res = mockRes();

        await addReview({ body: { rating: 4 }, params: { id: 'e1' }, user: { id: 'u1' } }, res);

        expect(res.status.calledWith(409)).to.equal(true);
        expect(create.called).to.equal(false);
    });

    it('returns 403 when an organiser reviews their own event', async () => {
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1',
            organiserId: 'u1',
            startsAt: new Date(Date.now() - 1000),
        });
        const res = mockRes();

        await addReview({
            body: { rating: 4 },
            params: { id: 'e1' },
            user: { id: 'u1', role: 'organiser' },
        }, res);

        expect(res.status.calledWith(403)).to.equal(true);
    });

    it('stores a rating and optional comment for a confirmed customer', async () => {
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1',
            organiserId: 'organiser1',
            startsAt: new Date(Date.now() - 1000),
        });
        sinon.stub(Booking, 'findOne').resolves({ _id: 'b1', status: 'confirmed' });
        sinon.stub(Review, 'findOne').resolves(null);
        const review = { eventId: 'e1', customerId: 'u1', rating: 5, comment: 'Excellent', createdAt: new Date() };
        const create = sinon.stub(Review, 'create').resolves(review);
        const res = mockRes();

        await addReview({ body: { rating: 5, comment: ' Excellent ' }, params: { id: 'e1' }, user: { id: 'u1' } }, res);

        expect(create.firstCall.args[0]).to.deep.equal({ eventId: 'e1', customerId: 'u1', rating: 5, comment: 'Excellent' });
        expect(res.status.calledWith(201)).to.equal(true);
        expect(res.json.firstCall.args[0].review).to.equal(review);
    });

    it('returns 409 when the customer already reviewed the event', async () => {
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1',
            organiserId: 'organiser1',
            startsAt: new Date(Date.now() - 1000),
        });
        sinon.stub(Booking, 'findOne').resolves({ _id: 'b1', status: 'confirmed' });
        sinon.stub(Review, 'findOne').resolves(null);
        sinon.stub(Review, 'create').rejects({ code: 11000, message: 'duplicate key' });
        const res = mockRes();

        await addReview({ body: { rating: 4 }, params: { id: 'e1' }, user: { id: 'u1' } }, res);

        expect(res.status.calledWith(409)).to.equal(true);
    });
});

describe('event review listing', () => {
    afterEach(() => sinon.restore());

    it('includes populated reviewer names and review dates on published events', async () => {
        const event = { _id: 'e1', toObject: () => ({ _id: 'e1', title: 'Live music' }) };
        const reviewDate = new Date('2026-10-01T12:00:00Z');
        const review = {
            eventId: 'e1',
            customerId: { name: 'Ari Customer' },
            rating: 5,
            comment: 'Excellent',
            createdAt: reviewDate,
            toObject: () => ({
                eventId: 'e1',
                customerId: { name: 'Ari Customer' },
                rating: 5,
                comment: 'Excellent',
                createdAt: reviewDate,
            }),
        };
        sinon.stub(Event, 'find').returns({ sort: sinon.stub().resolves([event]) });
        const reviewQuery = {
            populate: sinon.stub().returnsThis(),
            sort: sinon.stub().resolves([review]),
        };
        sinon.stub(Review, 'find').returns(reviewQuery);
        const res = mockRes();

        await getPublishedEvents({}, res);

        const publishedEvent = res.json.firstCall.args[0][0];
        expect(publishedEvent.reviews[0].reviewerId.name).to.equal('Ari Customer');
        expect(publishedEvent.reviews[0].createdAt).to.equal(reviewDate);
        expect(publishedEvent.averageRating).to.equal(5);
        expect(reviewQuery.populate.calledWith('customerId', 'name')).to.equal(true);
    });

    it('recalculates one-decimal averages and leaves unrated events without a zero rating', async () => {
        const events = [
            { _id: 'e1', toObject: () => ({ _id: 'e1', title: 'Rated event' }) },
            { _id: 'e2', toObject: () => ({ _id: 'e2', title: 'Unrated event' }) },
        ];
        const reviews = [5, 4].map((rating) => ({
            eventId: 'e1',
            customerId: { name: 'Customer' },
            rating,
            toObject: () => ({
                eventId: 'e1',
                customerId: { name: 'Customer' },
                rating,
            }),
        }));
        sinon.stub(Event, 'find').returns({ sort: sinon.stub().resolves(events) });
        let currentReviews = reviews;
        const reviewQuery = {
            populate: sinon.stub().returnsThis(),
            sort: sinon.stub().callsFake(() => Promise.resolve(currentReviews)),
        };
        sinon.stub(Review, 'find').returns(reviewQuery);
        const res = mockRes();

        await getPublishedEvents({}, res);
        expect(res.json.firstCall.args[0].map((event) => event.averageRating)).to.deep.equal([4.5, null]);

        currentReviews = [...reviews, {
            eventId: 'e1',
            customerId: { name: 'Another customer' },
            rating: 5,
            toObject: () => ({
                eventId: 'e1',
                customerId: { name: 'Another customer' },
                rating: 5,
            }),
        }];
        await getPublishedEvents({}, res);

        expect(res.json.secondCall.args[0].map((event) => event.averageRating)).to.deep.equal([4.7, null]);
    });
});

describe('review middleware manager', () => {
    afterEach(() => sinon.restore());

    it('returns 401 when the request is unauthenticated', async () => {
        sinon.stub(Event, 'findById').resolves({
            _id: 'e1',
            organiserId: 'organiser1',
            startsAt: new Date(Date.now() - 1000),
        });
        const res = mockRes();

        await addReview({ body: { rating: 4 }, params: { id: 'e1' } }, res);

        expect(res.status.calledWith(401)).to.equal(true);
    });

    it('runs middleware in order and supports inserting and removing rules', async () => {
        const calls = [];
        const first = { process: async (req, res, next) => { calls.push('first'); return next(); } };
        const inserted = { process: async (req, res, next) => { calls.push('inserted'); return next(); } };
        const last = { process: async (req, res, next) => { calls.push('last'); return next(); } };
        const manager = new ReviewMiddlewareManager([first, last]);
        manager.add(inserted, 1);

        expect(await manager.process({}, mockRes())).to.equal(true);
        expect(calls).to.deep.equal(['first', 'inserted', 'last']);

        calls.length = 0;
        manager.remove(inserted);
        expect(await manager.process({}, mockRes())).to.equal(true);
        expect(calls).to.deep.equal(['first', 'last']);
    });

    it('declares a unique compound index on eventId and customerId', () => {
        const customerIndex = Review.schema.indexes().find(([fields]) =>
            fields.eventId === 1 && fields.customerId === 1
        );

        expect(customerIndex).to.not.equal(undefined);
        expect(customerIndex[1].unique).to.equal(true);
    });

    it('migrates existing reviewerId values and replaces the old unique index', async () => {
        const collection = {
            indexes: sinon.stub().resolves([{
                name: 'eventId_1_reviewerId_1',
                key: { eventId: 1, reviewerId: 1 },
                unique: true,
            }]),
            dropIndex: sinon.stub().resolves(),
            updateMany: sinon.stub().resolves(),
            createIndex: sinon.stub().resolves('eventId_1_customerId_1'),
        };

        const indexName = await migrateReviewCustomerId(collection);

        expect(collection.dropIndex.calledOnceWith('eventId_1_reviewerId_1')).to.equal(true);
        expect(collection.updateMany.firstCall.args).to.deep.equal([
            { customerId: { $exists: false }, reviewerId: { $exists: true } },
            { $rename: { reviewerId: 'customerId' } },
        ]);
        expect(collection.createIndex.calledOnceWith(
            { eventId: 1, customerId: 1 },
            { unique: true }
        )).to.equal(true);
        expect(indexName).to.equal('eventId_1_customerId_1');
    });
});