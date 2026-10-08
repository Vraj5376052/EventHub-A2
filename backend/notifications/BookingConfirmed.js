const BaseNotification = require('./BaseNotification');

/**
 * Sent to the customer the moment a booking succeeds, so the reference is in
 * the app and not only in the response they may have navigated away from.
 */
class BookingConfirmed extends BaseNotification {
    get type() {
        return 'BookingConfirmed';
    }

    buildMessage() {
        this.require('eventTitle', 'quantity', 'reference');
        const { eventTitle, quantity, reference } = this.data;
        const tickets = quantity === 1 ? '1 ticket' : `${quantity} tickets`;
        return `Your booking for ${eventTitle} is confirmed. ${tickets}, reference ${reference}.`;
    }
}

module.exports = BookingConfirmed;
