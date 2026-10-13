process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const sinon = require('sinon');

const Event = require('../models/Event');
const EventSearchFacade = require('../patterns/EventSearchFacade');

describe('EventSearchFacade', () => {
  let aggregateStub;

  beforeEach(() => {
    aggregateStub = sinon.stub(Event, 'aggregate').resolves([]);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('filters published events by category', async () => {
    await EventSearchFacade.searchEvents({
      category: 'Music',
      sort: 'date',
    });

    expect(aggregateStub.calledOnce).to.equal(true);

    const pipeline = aggregateStub.firstCall.args[0];

    expect(pipeline[0].$match.status).to.equal('published');
    expect(pipeline[0].$match.category).to.equal('music');
  });

  it('performs a case-insensitive keyword search on title and venue', async () => {
    await EventSearchFacade.searchEvents({
      keyword: 'Festival',
      sort: 'date',
    });

    const pipeline = aggregateStub.firstCall.args[0];
    const match = pipeline[0].$match;

    expect(match.$or).to.deep.equal([
      {
        title: {
          $regex: 'Festival',
          $options: 'i',
        },
      },
      {
        venue: {
          $regex: 'Festival',
          $options: 'i',
        },
      },
    ]);
  });

  it('supports category, keyword and sort together', async () => {
    await EventSearchFacade.searchEvents({
      category: 'Workshop',
      keyword: 'Cyber',
      sort: 'price',
    });

    const pipeline = aggregateStub.firstCall.args[0];

    expect(pipeline[0].$match.status).to.equal('published');
    expect(pipeline[0].$match.category).to.equal('workshop');
    expect(pipeline[0].$match.$or).to.deep.equal([
      {
        title: {
          $regex: 'Cyber',
          $options: 'i',
        },
      },
      {
        venue: {
          $regex: 'Cyber',
          $options: 'i',
        },
      },
    ]);

    expect(pipeline[pipeline.length - 1]).to.deep.equal({
      $sort: {
        price: 1,
        startsAt: 1,
      },
    });
  });

  it('sorts events by date', async () => {
    await EventSearchFacade.searchEvents({
      sort: 'date',
    });

    const pipeline = aggregateStub.firstCall.args[0];

    expect(pipeline[pipeline.length - 1]).to.deep.equal({
      $sort: {
        startsAt: 1,
      },
    });
  });

  it('sorts events by price', async () => {
    await EventSearchFacade.searchEvents({
      sort: 'price',
    });

    const pipeline = aggregateStub.firstCall.args[0];

    expect(pipeline[pipeline.length - 1]).to.deep.equal({
      $sort: {
        price: 1,
        startsAt: 1,
      },
    });
  });

  it('sorts events by seats remaining', async () => {
    await EventSearchFacade.searchEvents({
      sort: 'seatsRemaining',
    });

    const pipeline = aggregateStub.firstCall.args[0];

    expect(pipeline[1]).to.deep.equal({
      $addFields: {
        seatsRemaining: {
          $subtract: ['$capacity', '$bookedSeats'],
        },
      },
    });

    expect(pipeline[pipeline.length - 1]).to.deep.equal({
      $sort: {
        seatsRemaining: -1,
        startsAt: 1,
      },
    });
  });

  it('rejects an unsupported sort value with status code 400', async () => {
    let caughtError;

    try {
      await EventSearchFacade.searchEvents({
        sort: 'invalid-sort',
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).to.be.instanceOf(Error);
    expect(caughtError.statusCode).to.equal(400);
    expect(caughtError.message).to.equal(
      'Invalid sort value. Use date, price, or seatsRemaining.'
    );

    expect(aggregateStub.called).to.equal(false);
  });

  it('defaults to upcoming events when no timeframe is given', async () => {
    await EventSearchFacade.searchEvents({
      sort: 'date',
    });

    const pipeline = aggregateStub.firstCall.args[0];

    expect(pipeline[0].$match.startsAt.$gte).to.be.a('date');
  });

  it('returns past events when asked, which is what the review flow needs', async () => {
    await EventSearchFacade.searchEvents({
      when: 'past',
      sort: 'date',
    });

    const pipeline = aggregateStub.firstCall.args[0];

    expect(pipeline[0].$match.startsAt.$lt).to.be.a('date');
    expect(pipeline[pipeline.length - 1]).to.deep.equal({
      $sort: {
        startsAt: -1,
      },
    });
  });
});
