// Mocha requires every spec file before running any of them, so setting this
// here applies to the whole run. It keeps the deliberately failed writes in
// these tests from printing console noise over everyone else's output.
process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const BaseNotification = require('../notifications/BaseNotification');
const BookingConfirmed = require('../notifications/BookingConfirmed');
const BookingCancelled = require('../notifications/BookingCancelled');
const CapacityWarning = require('../notifications/CapacityWarning');
const { createNotification } = require('../notifications');

describe('Notification inheritance (FR-09, US-4.1)', () => {
    it('refuses to construct the abstract base class directly', () => {
        expect(() => new BaseNotification('u1', {})).to.throw('abstract');
    });

    it('refuses to construct a notification with no recipient', () => {
        expect(() => new BookingConfirmed(null, {})).to.throw('needs a recipient');
    });

    it('every type inherits from the base class', () => {
        expect(new BookingConfirmed('u1', {})).to.be.instanceOf(BaseNotification);
        expect(new BookingCancelled('u1', {})).to.be.instanceOf(BaseNotification);
        expect(new CapacityWarning('u1', {})).to.be.instanceOf(BaseNotification);
    });

    it('each type reports its own name', () => {
        expect(new BookingConfirmed('u1', {}).type).to.equal('BookingConfirmed');
        expect(new BookingCancelled('u1', {}).type).to.equal('BookingCancelled');
        expect(new CapacityWarning('u1', {}).type).to.equal('CapacityWarning');
    });

    it('the base class refuses to build a message on its own', () => {
        class Bare extends BaseNotification {}
        expect(() => new Bare('u1', {}).buildMessage()).to.throw('must implement buildMessage()');
    });

    it('a subclass that does not name itself is rejected', () => {
        class Bare extends BaseNotification {}
        expect(() => new Bare('u1', {}).type).to.throw('must provide a type');
    });

    it('toRecord is inherited and shapes the row for the model', () => {
        const record = new BookingConfirmed('u1', {
            eventTitle: 'Jazz Night', quantity: 2, reference: 'EH-ABC12', relatedId: 'b1',
        }).toRecord();

        expect(record.userId).to.equal('u1');
        expect(record.type).to.equal('BookingConfirmed');
        expect(record.relatedId).to.equal('b1');
        expect(record.message).to.be.a('string');
    });
});

describe('Notification message text (FR-09, US-4.1)', () => {
    it('BookingConfirmed names the event, the count and the reference', () => {
        const message = new BookingConfirmed('u1', {
            eventTitle: 'Jazz Night', quantity: 2, reference: 'EH-ABC12',
        }).buildMessage();

        expect(message).to.equal('Your booking for Jazz Night is confirmed. 2 tickets, reference EH-ABC12.');
    });

    it('BookingConfirmed says "1 ticket", not "1 tickets"', () => {
        const message = new BookingConfirmed('u1', {
            eventTitle: 'Jazz Night', quantity: 1, reference: 'EH-ABC12',
        }).buildMessage();

        expect(message).to.contain('1 ticket,');
    });

    it('BookingCancelled states the refund when there is one', () => {
        const message = new BookingCancelled('u1', {
            eventTitle: 'Jazz Night', refundAmount: 45.5,
        }).buildMessage();

        expect(message).to.contain('Your booking for Jazz Night has been cancelled.');
        expect(message).to.contain('$45.50');
    });

    it('BookingCancelled says so plainly when no refund applies', () => {
        const message = new BookingCancelled('u1', {
            eventTitle: 'Jazz Night', refundAmount: 0,
        }).buildMessage();

        expect(message).to.contain('No refund applies');
    });

    it('BookingCancelled blames the organiser when the event was called off', () => {
        const message = new BookingCancelled('u1', {
            eventTitle: 'Jazz Night', refundAmount: 90, reason: 'event_cancelled',
        }).buildMessage();

        expect(message).to.contain('has been cancelled by the organiser');
    });

    it('CapacityWarning reports what is left against the capacity', () => {
        const message = new CapacityWarning('u1', {
            eventTitle: 'Jazz Night', seatsRemaining: 3, capacity: 50,
        }).buildMessage();

        expect(message).to.equal('Jazz Night is almost full. Only 3 seats of 50 remain.');
    });

    it('CapacityWarning says "1 seat", not "1 seats"', () => {
        const message = new CapacityWarning('u1', {
            eventTitle: 'Jazz Night', seatsRemaining: 1, capacity: 50,
        }).buildMessage();

        expect(message).to.contain('Only 1 seat of 50');
    });

    it('a type missing the data it needs fails with a message naming the fields', () => {
        expect(() => new BookingConfirmed('u1', { eventTitle: 'Jazz Night' }).buildMessage())
            .to.throw('missing: quantity, reference');
    });
});

describe('Notification type lookup (FR-09, US-4.1)', () => {
    it('returns the right subclass for a known name', () => {
        expect(createNotification('BookingConfirmed', 'u1', {})).to.be.instanceOf(BookingConfirmed);
        expect(createNotification('CapacityWarning', 'u1', {})).to.be.instanceOf(CapacityWarning);
    });

    it('throws a clear error naming the valid types for an unknown one', () => {
        expect(() => createNotification('BookingRefunded', 'u1', {}))
            .to.throw('Unknown notification type "BookingRefunded"');
    });
});
