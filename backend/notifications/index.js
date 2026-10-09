const Notification = require('../models/Notification');
const BookingConfirmed = require('./BookingConfirmed');
const BookingCancelled = require('./BookingCancelled');
const CapacityWarning = require('./CapacityWarning');

/**
 * The three kinds of notification the system can send (FR-09, US-4.1).
 *
 * This is a plain lookup from a name to a class, not a design pattern. It
 * exists so the controllers can say what happened without importing and
 * choosing between the classes themselves, and so an unrecognised name fails
 * in one place with a clear message instead of silently producing nothing.
 */
const TYPES = {
    BookingConfirmed,
    BookingCancelled,
    CapacityWarning,
};

/**
 * Build a notification object. Throws on an unknown type, which is the
 * behaviour the caller below relies on.
 */
function createNotification(type, userId, data = {}) {
    const NotificationClass = TYPES[type];

    if (!NotificationClass) {
        throw new Error(
            `Unknown notification type "${type}". Expected one of: ${Object.keys(TYPES).join(', ')}.`
        );
    }

    return new NotificationClass(userId, data);
}

/**
 * Build the notification and store it.
 *
 * Same rule as the audit logger: controllers must not await this, and it never
 * rejects. A notification is a courtesy. If one cannot be written, the booking
 * it was telling the customer about has still happened and must still succeed
 * (NFR-04). The unknown-type error from createNotification is caught here.
 */
function notify(type, userId, data = {}) {
    // Quiet under test for the same reason as the audit logger: a test that
    // deliberately fails a write should not print across other people's output.
    const report = (prefix, error) => {
        if (process.env.NODE_ENV !== 'test') {
            console.error(prefix, error.message);
        }
        return null;
    };

    try {
        const notification = createNotification(type, userId, data);
        return Notification.create(notification.toRecord())
            .catch((error) => report('Notification write failed:', error));
    } catch (error) {
        return Promise.resolve(report('Notification could not be built:', error));
    }
}

module.exports = { createNotification, notify, TYPES };
