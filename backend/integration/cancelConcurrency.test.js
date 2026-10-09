const { expect } = require('chai');

const API = 'http://localhost:5001';
const ATTEMPTS = 50;
const QUANTITY = 2;

const auth = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
});

describe('Cancellation concurrency (NFR-01, US-1.2)', function () {
    this.timeout(30000);

    let seatsBefore;
    let seatsAfter;
    let tally;

    before(async () => {
        const email = process.env.TEST_EMAIL;
        const password = process.env.TEST_PASSWORD;
        if (!email || !password) {
            throw new Error('Set TEST_EMAIL and TEST_PASSWORD before running.');
        }

        const loginRes = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const { token } = await loginRes.json();

        const seatsFor = async (eventId) => {
            const res = await fetch(`${API}/api/events`, { headers: auth(token) });
            const all = await res.json();
            return all.find((e) => e._id === eventId).bookedSeats;
        };

        const eventsRes = await fetch(`${API}/api/events`, { headers: auth(token) });
        const events = await eventsRes.json();
        const event = events.find(
            (e) => e.capacity - e.bookedSeats >= QUANTITY && new Date(e.startsAt) > Date.now()
        );
        if (!event) throw new Error('No upcoming event with free seats.');

        seatsBefore = await seatsFor(event._id);

        const bookRes = await fetch(`${API}/api/bookings`, {
            method: 'POST',
            headers: auth(token),
            body: JSON.stringify({ eventId: event._id, quantity: QUANTITY }),
        });
        const { booking } = await bookRes.json();

        const results = await Promise.all(
            Array.from({ length: ATTEMPTS }, () =>
                fetch(`${API}/api/bookings/${booking._id}/cancel`, {
                    method: 'PATCH',
                    headers: auth(token),
                }).then((r) => r.status)
            )
        );

        tally = results.reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {});
        seatsAfter = await seatsFor(event._id);
    });

    it('accepts exactly one of 50 simultaneous cancellations', () => {
        expect(tally['200']).to.equal(1);
    });

    it('rejects the other 49 with HTTP 400', () => {
        expect(tally['400']).to.equal(ATTEMPTS - 1);
    });

    it('releases the seats exactly once', () => {
        expect(seatsAfter).to.equal(seatsBefore);
    });
});