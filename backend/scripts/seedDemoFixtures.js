/**
 * Seeds the fixtures the Postman collection needs but cannot create for itself.
 *
 * Two things the API deliberately refuses to make:
 *
 *   1. An admin account. 'admin' is a valid role on the User model because it
 *      reads the audit trail (FR-10), but it is left out of the whitelist in
 *      registerUser so nobody can grant it to themselves. It therefore has to
 *      be created directly against the database.
 *
 *   2. A reviewable event. A review is only allowed once the event has started
 *      (FR-07) and only from a customer holding a confirmed booking, but
 *      createEvent refuses a start date in the past and bookings close once an
 *      event starts. So the past event and its booking are seeded here.
 *
 * Safe to run more than once. Everything is matched on email or on the pair of
 * ids, so a second run updates rather than duplicates.
 *
 * Usage, against whichever database MONGO_URI points at:
 *
 *   cd backend
 *   node scripts/seedDemoFixtures.js
 *
 * No password is stored in this file. Set SEED_PASSWORD to choose one, or let
 * the script generate a random one and print it once.
 */

const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

const ADMIN_EMAIL = 'admin@eventhub.test';
const REVIEWER_EMAIL = 'reviewer@eventhub.test';
const ORGANISER_EMAIL = 'seed.organiser@eventhub.test';
const PAST_EVENT_TITLE = 'Seeded Past Concert';

async function upsertUser(email, name, role, password) {
    let user = await User.findOne({ email });
    if (user) {
        // Reset the password so a rerun always leaves a known login, and
        // correct the role in case it drifted.
        user.password = password;
        user.role = role;
        await user.save();
        return { user, created: false };
    }
    user = await User.create({ name, email, password, role });
    return { user, created: true };
}

/**
 * Creates the fixtures on an already connected mongoose instance.
 * Returns the ids and the password so a caller can print or reuse them.
 */
async function seedFixtures({ password, quiet = false } = {}) {
    const log = quiet ? () => {} : console.log;
    const admin = await upsertUser(ADMIN_EMAIL, 'Audit Admin', 'admin', password);
    log(`${admin.created ? 'Created' : 'Updated'} admin      ${ADMIN_EMAIL}`);

    const organiser = await upsertUser(ORGANISER_EMAIL, 'Seed Organiser', 'organiser', password);
    log(`${organiser.created ? 'Created' : 'Updated'} organiser  ${ORGANISER_EMAIL}`);

    const reviewer = await upsertUser(REVIEWER_EMAIL, 'Seed Reviewer', 'customer', password);
    log(`${reviewer.created ? 'Created' : 'Updated'} customer   ${REVIEWER_EMAIL}`);

    // A past event, so it is reviewable. Dated yesterday rather than long ago
    // so it still looks like real activity on the board.
    const startsAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let event = await Event.findOne({ title: PAST_EVENT_TITLE, organiserId: organiser.user._id });
    if (event) {
        event.startsAt = startsAt;
        await event.save();
    } else {
        event = await Event.create({
            organiserId: organiser.user._id,
            title: PAST_EVENT_TITLE,
            description: 'Seeded so the review endpoint has an event it will accept.',
            category: 'music',
            venue: 'QUT Gardens Point',
            startsAt,
            capacity: 100,
            bookedSeats: 1,
            price: 25,
        });
    }
    log(`Past event ready       ${event._id}`);

    // The confirmed booking that entitles the reviewer to review it.
    let booking = await Booking.findOne({ eventId: event._id, customerId: reviewer.user._id });
    if (!booking) {
        booking = await Booking.create({
            eventId: event._id,
            customerId: reviewer.user._id,
            quantity: 1,
            reference: 'EH-SEED1',
            status: 'confirmed',
        });
    } else if (booking.status !== 'confirmed') {
        booking.status = 'confirmed';
        booking.cancelledAt = null;
        await booking.save();
    }
    log(`Confirmed booking ready ${booking.reference}`);

    return {
        seedEventId: String(event._id),
        reviewerEmail: REVIEWER_EMAIL,
        adminEmail: ADMIN_EMAIL,
        organiserEmail: ORGANISER_EMAIL,
        password,
    };
}

/** Entry point when run from the command line against MONGO_URI. */
async function run() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
    }

    const generated = !process.env.SEED_PASSWORD;
    const password = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url') + 'Aa1';

    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to database: ${mongoose.connection.name}`);

    const result = await seedFixtures({ password });

    console.log('');
    console.log('Postman collection variables:');
    console.log(`  seedEventId      ${result.seedEventId}`);
    console.log(`  reviewerEmail    ${result.reviewerEmail}`);
    if (generated) {
        console.log('');
        console.log(`  Generated password, shown once: ${password}`);
        console.log('  Set SEED_PASSWORD next time to choose your own.');
    }

    await mongoose.disconnect();
}

module.exports = { seedFixtures, ADMIN_EMAIL, REVIEWER_EMAIL, ORGANISER_EMAIL };

if (require.main === module) {
    run().catch(async (error) => {
        console.error('Seed failed:', error.message);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    });
}
