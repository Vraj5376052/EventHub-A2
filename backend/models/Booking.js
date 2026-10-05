const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    // Set when the customer cancels. Null on a confirmed booking.
    cancelledAt: { type: Date, default: null },
    // What the refund policy awarded at the moment of cancellation. Stored so
    // the figure can't drift if the policy rules change later.
    refundAmount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);