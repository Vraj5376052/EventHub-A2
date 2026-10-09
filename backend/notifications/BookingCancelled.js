const BaseNotification = require('./BaseNotification');

/**
 * Sent when a booking ends, whether the customer cancelled it themselves or
 * the organiser called off the event. The reason is part of the data so one
 * class covers both, and the refund figure is included because that is the
 * first thing the customer wants to know.
 */
class BookingCancelled extends BaseNotification {
    get type() {
        return 'BookingCancelled';
    }

    buildMessage() {
        this.require('eventTitle', 'refundAmount');
        const { eventTitle, refundAmount, reason } = this.data;
        const opening = reason === 'event_cancelled'
            ? `${eventTitle} has been cancelled by the organiser.`
            : `Your booking for ${eventTitle} has been cancelled.`;

        return Number(refundAmount) > 0
            ? `${opening} A refund of ${this.money(refundAmount)} is being processed.`
            : `${opening} No refund applies under the cancellation policy.`;
    }
}

module.exports = BookingCancelled;
