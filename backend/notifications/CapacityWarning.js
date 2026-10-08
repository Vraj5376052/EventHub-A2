const BaseNotification = require('./BaseNotification');

/**
 * Sent to the organiser when one of their events is nearly full, so they can
 * decide whether to raise the capacity before it sells out rather than after.
 */
class CapacityWarning extends BaseNotification {
    get type() {
        return 'CapacityWarning';
    }

    buildMessage() {
        this.require('eventTitle', 'seatsRemaining', 'capacity');
        const { eventTitle, seatsRemaining, capacity } = this.data;
        const seats = seatsRemaining === 1 ? '1 seat' : `${seatsRemaining} seats`;
        return `${eventTitle} is almost full. Only ${seats} of ${capacity} remain.`;
    }
}

module.exports = CapacityWarning;
