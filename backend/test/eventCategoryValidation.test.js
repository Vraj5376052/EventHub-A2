
process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const sinon = require('sinon');
const { createEvent } = require('../controllers/eventController');

describe('FR-04 - createEvent category validation', () => {
  afterEach(() => sinon.restore());

  const mockResponse = () => ({
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis()
  });

  it('returns 400 with field category when category is missing', async () => {
    const req = {
      body: {
        title: 'Test Concert',
        venue: 'QUT Gardens Point',
        startsAt: '2027-06-01T19:00:00.000Z',
        capacity: 10,
        price: 50
      }
    };
    const res = mockResponse();

    await createEvent(req, res);

    expect(res.status.calledOnceWithExactly(400)).to.equal(true);
    expect(res.json.calledOnce).to.equal(true);
    expect(res.json.firstCall.args[0]).to.have.property('field', 'category');
  });

  it('returns 400 with field category when category is invalid', async () => {
    const req = {
      body: {
        title: 'Test Concert',
        category: 'food',
        venue: 'QUT Gardens Point',
        startsAt: '2027-06-01T19:00:00.000Z',
        capacity: 10,
        price: 50
      }
    };
    const res = mockResponse();

    await createEvent(req, res);

    expect(res.status.calledOnceWithExactly(400)).to.equal(true);
    expect(res.json.calledOnce).to.equal(true);
    expect(res.json.firstCall.args[0]).to.have.property('field', 'category');
  });
});
