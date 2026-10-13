process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const EventQueryBuilder = require('../patterns/EventQueryBuilder');

describe('EventQueryBuilder', () => {
  it('builds a category filter', () => {
    const pipeline = new EventQueryBuilder()
      .withCategory(' Music ')
      .build();

    expect(pipeline[0]).to.deep.equal({
      $match: {
        status: 'published',
        category: 'music',
      },
    });
  });

  it('builds a case-insensitive keyword search', () => {
    const pipeline = new EventQueryBuilder()
      .withKeyword('Jazz')
      .build();

    expect(pipeline[0].$match.$or).to.deep.equal([
      {
        title: {
          $regex: 'Jazz',
          $options: 'i',
        },
      },
      {
        venue: {
          $regex: 'Jazz',
          $options: 'i',
        },
      },
    ]);
  });

  it('builds all supported sort options', () => {
    const datePipeline = new EventQueryBuilder()
      .sortedBy('date')
      .build();

    const pricePipeline = new EventQueryBuilder()
      .sortedBy('price')
      .build();

    const seatsPipeline = new EventQueryBuilder()
      .sortedBy('seatsRemaining')
      .build();

    expect(datePipeline[datePipeline.length - 1]).to.deep.equal({
      $sort: { startsAt: 1 },
    });

    expect(pricePipeline[pricePipeline.length - 1]).to.deep.equal({
      $sort: { price: 1, startsAt: 1 },
    });

    expect(seatsPipeline[seatsPipeline.length - 1]).to.deep.equal({
      $sort: { seatsRemaining: -1, startsAt: 1 },
    });
  });

  it('combines category, keyword and sorting', () => {
    const pipeline = new EventQueryBuilder()
      .withCategory('Music')
      .withKeyword('Brisbane')
      .sortedBy('price')
      .build();

    expect(pipeline[0].$match.status).to.equal('published');
    expect(pipeline[0].$match.category).to.equal('music');

    expect(pipeline[0].$match.$or).to.deep.equal([
      {
        title: {
          $regex: 'Brisbane',
          $options: 'i',
        },
      },
      {
        venue: {
          $regex: 'Brisbane',
          $options: 'i',
        },
      },
    ]);

    expect(pipeline[pipeline.length - 1]).to.deep.equal({
      $sort: { price: 1, startsAt: 1 },
    });
  });

  it('supports chainable builder methods without using the database', () => {
    const builder = new EventQueryBuilder();

    expect(builder.withCategory('music')).to.equal(builder);
    expect(builder.withKeyword('concert')).to.equal(builder);
    expect(builder.sortedBy('date')).to.equal(builder);

    expect(builder.build()).to.be.an('array');
  });

  it('rejects an invalid sort value with status code 400', () => {
    try {
      new EventQueryBuilder().sortedBy('invalid-sort');
      throw new Error('Expected sortedBy to throw');
    } catch (error) {
      expect(error.message).to.equal(
        'Invalid sort value. Use date, price, or seatsRemaining.'
      );
      expect(error.statusCode).to.equal(400);
    }
  });
});
