const AuditLog = require('../models/AuditLog');

/**
 * AuditLogger
 *
 * Singleton Design Pattern. One shared logger instance for the whole
 * application. Every controller that changes state writes through this object
 * and nothing constructs its own (FR-10, NFR-04, US-4.3).
 *
 * Why a singleton rather than just exporting a function:
 *
 *   The audit trail has to be one trail. If each controller could build its
 *   own logger, each one could end up with its own switch for whether logging
 *   is on, its own idea of the record format, and its own error handling. The
 *   log would then be only as trustworthy as the least careful caller. Holding
 *   exactly one instance means the configuration, the format and the
 *   swallow-the-error rule are decided once, in here, and every caller gets
 *   them whether it wants them or not.
 *
 * How the single instance is enforced:
 *
 *   The constructor hands back the existing instance instead of building a
 *   second one, so `new AuditLogger() === new AuditLogger()` is true. The
 *   module then exports that instance, so `require()` from any file in the
 *   application returns the same object. Both routes to it lead to the one
 *   place.
 *
 * Writes never block and never fail the caller:
 *
 *   record() is deliberately not awaited by controllers. It starts the write
 *   and returns immediately, and any failure is caught in here. Audit logging
 *   is a supporting concern, so a database hiccup while writing the trail must
 *   not turn a customer's successful booking into a 500.
 */
class AuditLogger {
    constructor() {
        // The guard that makes this a singleton. A second `new` gets the first
        // object back rather than a fresh one.
        if (AuditLogger.instance) {
            return AuditLogger.instance;
        }

        this.enabled = true;
        this.writeCount = 0;
        this.failureCount = 0;
        this.lastError = null;

        AuditLogger.instance = this;
    }

    /** The conventional way to reach a singleton, for callers that prefer it. */
    static getInstance() {
        return AuditLogger.instance || new AuditLogger();
    }

    /**
     * Write one entry.
     *
     * Returns a promise so tests can wait for the write, but callers in the
     * request path must NOT await it. The promise resolves either way; it is
     * never rejected, because a logging problem is this object's problem and
     * not the caller's.
     *
     * @param {object}  actor       the req.user of whoever acted, or null for the system
     * @param {string}  action      stable verb, use the ACTIONS constants below
     * @param {string}  targetType  'Booking', 'Event', 'User'
     * @param {string}  targetId    id of the record acted on
     * @param {string} [detail]     short extra context, no personal data
     */
    record(actor, action, targetType, targetId, detail = '') {
        if (!this.enabled) {
            return Promise.resolve(null);
        }

        return AuditLog.create({
            actorId: actor && actor.id ? actor.id : null,
            actorEmail: actor && actor.email ? actor.email : 'system',
            actorRole: actor && actor.role ? actor.role : 'system',
            action,
            targetType,
            targetId: String(targetId),
            detail,
        })
            .then((entry) => {
                this.writeCount += 1;
                return entry;
            })
            .catch((error) => {
                // Swallowed on purpose. The user's action already succeeded and
                // must not be undone because the trail could not be written.
                this.failureCount += 1;
                this.lastError = error.message;

                // Counted and kept either way, and surfaced through stats() on
                // the admin page, so a silent gap in the trail is still
                // visible. The console line is skipped under test only, so a
                // deliberately failed write in one test does not print noise
                // across everybody else's output.
                if (process.env.NODE_ENV !== 'test') {
                    console.error('Audit log write failed:', error.message);
                }
                return null;
            });
    }

    /** Counters for the tests and for the admin page footer. */
    stats() {
        return {
            enabled: this.enabled,
            writeCount: this.writeCount,
            failureCount: this.failureCount,
            lastError: this.lastError,
        };
    }
}

/** The verbs used across the application, kept here so they cannot drift. */
AuditLogger.ACTIONS = {
    BOOKING_CREATED: 'BOOKING_CREATED',
    BOOKING_CANCELLED: 'BOOKING_CANCELLED',
    EVENT_CREATED: 'EVENT_CREATED',
    EVENT_UPDATED: 'EVENT_UPDATED',
    EVENT_CANCELLED: 'EVENT_CANCELLED',
};

// Export the one instance, so every `require` in the application shares it.
// ACTIONS is mirrored onto it so call sites read auditLogger.ACTIONS.X, and
// the class rides along purely so the unit test can prove that constructing
// it twice still yields this same object.
const auditLogger = new AuditLogger();
auditLogger.ACTIONS = AuditLogger.ACTIONS;
auditLogger.AuditLogger = AuditLogger;

module.exports = auditLogger;
