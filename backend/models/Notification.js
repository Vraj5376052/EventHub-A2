const mongoose = require('mongoose');

/**
 * Notification
 *
 * What a user sees in the app (FR-09). The message text is not composed here.
 * It is built by the matching notification class in backend/notifications and
 * stored already rendered, so the wording a user was shown stays the same even
 * if the wording in the code changes later.
 */
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Matches the subclass that produced it: BookingConfirmed,
    // BookingCancelled or CapacityWarning.
    type: {
        type: String,
        enum: ['BookingConfirmed', 'BookingCancelled', 'CapacityWarning'],
        required: true,
    },

    message: { type: String, required: true },

    // The booking or event this is about, so the UI can link to it.
    relatedId: { type: String, default: null },

    read: { type: Boolean, default: false },
}, { timestamps: true });

// The list endpoint only ever asks for one user's rows, newest first.
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
