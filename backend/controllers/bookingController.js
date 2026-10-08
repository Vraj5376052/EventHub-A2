const Booking = require('../models/Booking');
const Event = require('../models/Event');
const RefundPolicyFactory = require('../patterns/RefundPolicyFactory');
const auditLogger = require('../patterns/AuditLogger');
const { notify } = require('../notifications');

// Warn the organiser once an event is down to its last tenth, with a floor of
// one seat so small events still trigger it.
const isNearlyFull = (event) => {
    const remaining = event.capacity - event.bookedSeats;
    return remaining > 0 && remaining <= Math.max(1, Math.ceil(event.capacity * 0.1));
};

const generateReference = () =>
    'EH-' + Math.random().toString(36).slice(2, 7).toUpperCase();

const createBooking = async (req, res) => {
    const { eventId, quantity } = req.body;
    try {
        const qty = Number(quantity);
        if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
            return res.status(400).json({ field: 'quantity', message: 'Choose between 1 and 10 tickets' });
        }
        if (!eventId) {
            return res.status(400).json({ field: 'eventId', message: 'Event is required' });
        }

        // Atomic: check availability and reserve the seats in ONE database operation.
        // Two people booking the last seat cannot both succeed.
        const event = await Event.findOneAndUpdate(
            {
                _id: eventId,
                status: 'published',
                $expr: { $lte: [{ $add: ['$bookedSeats', qty] }, '$capacity'] },
            },
            { $inc: { bookedSeats: qty } },
            { new: true }
        );

        if (!event) {
            const existing = await Event.findById(eventId);
            if (!existing || existing.status !== 'published') {
                return res.status(400).json({ message: 'This event is not open for booking' });
            }
            const remaining = existing.capacity - existing.bookedSeats;
            return res.status(400).json({
                field: 'quantity',
                message: remaining > 0
                    ? `Only ${remaining} seat${remaining === 1 ? '' : 's'} remaining`
                    : 'This event is sold out',
            });
        }

        try {
            const booking = await Booking.create({
                eventId: event._id,
                customerId: req.user.id,
                quantity: qty,
                reference: generateReference(),
            });

            // None of these are awaited (FR-09, FR-10, NFR-04). The seats are
            // taken and the booking is saved, so the customer gets their 201
            // whatever happens to the trail or the notification.
            auditLogger.record(
                req.user,
                auditLogger.ACTIONS.BOOKING_CREATED,
                'Booking',
                booking._id,
                `${qty} x ${event.title}`
            );

            notify('BookingConfirmed', req.user.id, {
                eventTitle: event.title,
                quantity: qty,
                reference: booking.reference,
                relatedId: booking._id,
            });

            if (isNearlyFull(event)) {
                notify('CapacityWarning', event.organiserId, {
                    eventTitle: event.title,
                    seatsRemaining: event.capacity - event.bookedSeats,
                    capacity: event.capacity,
                    relatedId: event._id,
                });
            }

            return res.status(201).json({ booking, event });
        } catch (bookingError) {
            // The seats were reserved but the booking record failed — give them back.
            await Event.updateOne({ _id: event._id }, { $inc: { bookedSeats: -qty } });
            throw bookingError;
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ customerId: req.user.id })
            .populate('eventId', 'title venue startsAt price status')
            .sort({ createdAt: -1 });

        // Work out what each confirmed booking would refund if cancelled right
        // now, so the page can show it before the customer commits.
        const withPreview = bookings.map((booking) => {
            const row = booking.toObject();
            if (booking.status === 'confirmed' && booking.eventId) {
                const hoursUntilEvent =
                    (new Date(booking.eventId.startsAt) - Date.now()) / 3600000;
                if (hoursUntilEvent > 0) {
                    const policy = RefundPolicyFactory.getPolicy(hoursUntilEvent);
                    row.refundPreview = {
                        amount: policy.calculate(booking.eventId.price * booking.quantity),
                        policy: policy.name,
                    };
                }
            }
            return row;
        });

        res.json(withPreview);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        if (booking.customerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'This booking is not yours' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'This booking is already cancelled' });
        }

        const event = await Event.findById(booking.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const hoursUntilEvent = (new Date(event.startsAt) - Date.now()) / 3600000;
        if (hoursUntilEvent <= 0) {
            return res.status(400).json({ message: 'This event has already started' });
        }

        // The controller never knows which rule it got. It asks for a policy
        // and uses whatever comes back.
        const policy = RefundPolicyFactory.getPolicy(hoursUntilEvent);
        const refundAmount = policy.calculate(event.price * booking.quantity);

        // Atomic: only the first request to find this booking still 'confirmed'
        // wins the flip, so the seats can be released exactly once no matter
        // how many cancellations arrive at the same moment.
        const cancelled = await Booking.findOneAndUpdate(
            { _id: booking._id, status: 'confirmed' },
            { $set: { status: 'cancelled', cancelledAt: new Date(), refundAmount } },
            { new: true }
        );
        if (!cancelled) {
            return res.status(400).json({ message: 'This booking is already cancelled' });
        }

        try {
            await Event.updateOne(
                { _id: event._id },
                { $inc: { bookedSeats: -booking.quantity } }
            );
        } catch (seatError) {
            // Put the booking back, so the two records can never disagree.
            await Booking.updateOne(
                { _id: booking._id },
                { $set: { status: 'confirmed', cancelledAt: null, refundAmount: 0 } }
            );
            throw seatError;
        }

        // Again not awaited. The cancellation and the seat release are both
        // done; telling the customer and recording it must not undo that.
        auditLogger.record(
            req.user,
            auditLogger.ACTIONS.BOOKING_CANCELLED,
            'Booking',
            cancelled._id,
            `refund ${refundAmount} under ${policy.name}`
        );

        notify('BookingCancelled', req.user.id, {
            eventTitle: event.title,
            refundAmount,
            reason: 'customer_cancelled',
            relatedId: cancelled._id,
        });

        return res.json({
            booking: cancelled,
            refund: { amount: refundAmount, policy: policy.name },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = { createBooking, getMyBookings, cancelBooking };