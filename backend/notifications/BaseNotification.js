/**
 * BaseNotification
 *
 * Inheritance (FR-09, US-4.1). Every kind of notification the system can send
 * is a subclass of this one.
 *
 * What lives where:
 *
 *   here        everything that is the same for all notifications: holding the
 *               recipient and the data, validating it, and turning the finished
 *               object into the row that gets stored
 *
 *   subclass    only what actually differs, which is the type name and the one
 *               sentence the user reads
 *
 * The point of splitting it this way is that adding a fourth kind of
 * notification is a new file with two small methods in it. Nothing that
 * already works has to be opened or retested. Without the base class each kind
 * would carry its own copy of the validation and the record building, and the
 * copies would drift apart.
 *
 * The base class is abstract by intent. It throws rather than guessing,
 * because a notification with no message is worse than a loud failure.
 */
class BaseNotification {
    /**
     * @param {string} userId  who should receive this
     * @param {object} data    whatever the subclass needs to write its message
     */
    constructor(userId, data = {}) {
        if (new.target === BaseNotification) {
            throw new Error('BaseNotification is abstract and cannot be created directly.');
        }
        if (!userId) {
            throw new Error('A notification needs a recipient.');
        }

        this.userId = userId;
        this.data = data;
    }

    /** Stored on the row and used by the UI to pick an icon. Must override. */
    get type() {
        throw new Error('A notification must provide a type.');
    }

    /** The sentence the user reads. Must override. */
    buildMessage() {
        throw new Error('A notification must implement buildMessage().');
    }

    /**
     * Shared guard. Subclasses call this with the fields they cannot work
     * without, so they all fail the same way instead of each inventing its own.
     */
    require(...fields) {
        const missing = fields.filter((field) => this.data[field] === undefined || this.data[field] === null);
        if (missing.length > 0) {
            throw new Error(`${this.type} notification is missing: ${missing.join(', ')}.`);
        }
    }

    /** Shared formatting, so every message writes money the same way. */
    money(amount) {
        return '$' + Number(amount).toFixed(2);
    }

    /**
     * The shape handed to the Notification model. Written once here rather
     * than three times in the subclasses.
     */
    toRecord() {
        return {
            userId: this.userId,
            type: this.type,
            message: this.buildMessage(),
            relatedId: this.data.relatedId ? String(this.data.relatedId) : null,
        };
    }
}

module.exports = BaseNotification;
