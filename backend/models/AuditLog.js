const mongoose = require('mongoose');

/**
 * AuditLog
 *
 * One row per significant thing that happened: who did it, what they did,
 * what they did it to, and when. Written only through the AuditLogger
 * singleton, never directly from a controller.
 *
 * The record is append only (NFR-04). Nothing in the application may edit or
 * delete a row once it is written, because an audit trail that can be quietly
 * rewritten is not evidence of anything. There is no update or delete
 * endpoint, and the hooks below block it at the model as well, so a future
 * mistake somewhere else in the code cannot silently erase history.
 */
const auditLogSchema = new mongoose.Schema({
    // Who. Stored by id and also denormalised, so the trail still reads
    // correctly after a user is renamed or removed.
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorEmail: { type: String, default: 'system' },
    actorRole: { type: String, default: 'system' },

    // What, as a stable machine readable verb such as BOOKING_CREATED.
    action: { type: String, required: true },

    // What it was done to.
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },

    // Anything extra worth keeping, kept small and free of personal data.
    detail: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Reading the trail is always "newest first, optionally filtered by action",
// so one compound index covers the only query the admin page makes.
auditLogSchema.index({ createdAt: -1, action: 1 });

const refuseToChange = function (next) {
    next(new Error('Audit log entries are append only and cannot be modified or removed.'));
};

auditLogSchema.pre('findOneAndUpdate', refuseToChange);
auditLogSchema.pre('updateOne', refuseToChange);
auditLogSchema.pre('updateMany', refuseToChange);
auditLogSchema.pre('findOneAndDelete', refuseToChange);
auditLogSchema.pre('deleteOne', refuseToChange);
auditLogSchema.pre('deleteMany', refuseToChange);

// Blocks doc.save() on a row that already exists, which the query hooks above
// do not cover.
auditLogSchema.pre('save', function (next) {
    if (!this.isNew) {
        return next(new Error('Audit log entries are append only and cannot be modified or removed.'));
    }
    next();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
