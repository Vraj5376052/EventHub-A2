/**
 * cancelConcurrencyCheck.js
 *
 * Verifies NFR-01: booking cancellation is atomic.
 *
 * Fires 50 simultaneous cancel requests at the same booking. Only one should succeed. If the guarded update is working, the seats are released exactly
 * once and the event's bookedSeats returns to where it started.
 *
 */

const API = 'http://localhost:5001';
const ATTEMPTS = 50;
const QUANTITY = 2;

const [email, password] = process.argv.slice(2);
if (!email || !password) {
    console.error('Usage: node scripts/cancelConcurrencyCheck.js <email> <password>');
    process.exit(1);
}

const auth = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
});

const seatsFor = async (token, eventId) => {
    const res = await fetch(`${API}/api/events`, { headers: auth(token) });
    const events = await res.json();
    return events.find((e) => e._id === eventId).bookedSeats;
};

(async () => {
    // 1. Log in
    const loginRes = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!loginRes.ok) {
        console.error('Login failed. Check the email and password.');
        process.exit(1);
    }
    const { token } = await loginRes.json();

    // 2. Find an event with room, starting far enough ahead to be cancellable
    const eventsRes = await fetch(`${API}/api/events`, { headers: auth(token) });
    const events = await eventsRes.json();
    const event = events.find(
        (e) => e.capacity - e.bookedSeats >= QUANTITY && new Date(e.startsAt) > Date.now()
    );
    if (!event) {
        console.error('No upcoming event with free seats. Create one first.');
        process.exit(1);
    }

    const before = await seatsFor(token, event._id);
    console.log(`Event       : ${event.title}`);
    console.log(`Seats taken : ${before} of ${event.capacity}\n`);

    // 3. Make one booking
    const bookRes = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ eventId: event._id, quantity: QUANTITY }),
    });
    const { booking } = await bookRes.json();
    const afterBooking = await seatsFor(token, event._id);
    console.log(`Booked ${QUANTITY} tickets, reference ${booking.reference}`);
    console.log(`Seats taken : ${afterBooking}\n`);

    // 4. Fire 50 cancellations at that one booking, all at once
    console.log(`Firing ${ATTEMPTS} simultaneous cancellations...\n`);
    const results = await Promise.all(
        Array.from({ length: ATTEMPTS }, () =>
            fetch(`${API}/api/bookings/${booking._id}/cancel`, {
                method: 'PATCH',
                headers: auth(token),
            }).then((r) => r.status)
        )
    );

    const tally = results.reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {});
    const afterCancel = await seatsFor(token, event._id);

    // 5. Report
    console.log('=== RESULT ===');
    Object.entries(tally).forEach(([status, count]) => {
        console.log(`HTTP ${status} : ${count}`);
    });
    console.log('');
    console.log(`Seats before booking : ${before}`);
    console.log(`Seats after booking  : ${afterBooking}`);
    console.log(`Seats after ${ATTEMPTS} cancels: ${afterCancel}`);
    console.log('');

    const oneSucceeded = tally['200'] === 1;
    const seatsCorrect = afterCancel === before;

    console.log(`Exactly one cancellation succeeded : ${oneSucceeded ? 'PASS' : 'FAIL'}`);
    console.log(`Seats released exactly once        : ${seatsCorrect ? 'PASS' : 'FAIL'}`);
    process.exit(oneSucceeded && seatsCorrect ? 0 : 1);
})();