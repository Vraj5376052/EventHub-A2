const Event = require('../models/Event');
const auditLogger = require('../patterns/AuditLogger');

const createEvent = async (req, res) => {
    const { title, description, venue, startsAt, capacity, price } = req.body;
    try {
        if (!title || title.trim().length < 3 || title.trim().length > 100) {
            return res.status(400).json({ field: 'title', message: 'Title must be between 3 and 100 characters' });
        }
        if (!venue || venue.trim().length < 2) {
            return res.status(400).json({ field: 'venue', message: 'Venue is required' });
        }
        const start = new Date(startsAt);
        if (!startsAt || isNaN(start.getTime())) {
            return res.status(400).json({ field: 'startsAt', message: 'Enter a valid date and time' });
        }
        if (start <= new Date()) {
            return res.status(400).json({ field: 'startsAt', message: 'Event start must be in the future' });
        }
        if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 10000) {
            return res.status(400).json({ field: 'capacity', message: 'Capacity must be a whole number between 1 and 10000' });
        }
        if (price === undefined || price === '' || isNaN(Number(price)) || Number(price) < 0) {
            return res.status(400).json({ field: 'price', message: 'Price must be 0 or more' });
        }

        const event = await Event.create({
            organiserId: req.user.id,
            title: title.trim(),
            description: (description || '').trim(),
            venue: venue.trim(),
            startsAt: start,
            capacity: Number(capacity),
            price: Number(price),
        });

        // Not awaited. The event is already created, and the response must not
        // wait on the audit trail or fail because of it (FR-10, NFR-04).
        auditLogger.record(
            req.user,
            auditLogger.ACTIONS.EVENT_CREATED,
            'Event',
            event._id,
            `capacity ${event.capacity}`
        );

        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyEvents = async (req, res) => {
    try {
        const events = await Event.find({ organiserId: req.user.id }).sort({ startsAt: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPublishedEvents = async (req, res) => {
    try {
        const events = await Event.find({ status: 'published' }).sort({ startsAt: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createEvent, getMyEvents, getPublishedEvents };