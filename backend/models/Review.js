const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: Number.isInteger,
    },
    comment: { type: String, default: '', maxlength: 500 },
}, { timestamps: { createdAt: true, updatedAt: false } });

reviewSchema.index({ eventId: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);